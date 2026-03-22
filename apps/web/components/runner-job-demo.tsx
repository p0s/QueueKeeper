"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { QueueJobView, QueueStageKey, SelfVerificationSessionView } from "@queuekeeper/shared";
import {
  createSelfVerificationSession,
  fetchDemoJob,
  fetchProofBundle,
  fetchSelfVerificationSession,
  makeDefaultProofHash,
  requestRunnerAcceptance,
  submitDemoProof
} from "../lib/agent-client";
import { acceptLiveJob, submitLiveProof } from "../lib/chain-client";
import { buildTxExplorerLinks } from "../lib/explorer";
import { getRunnerRevealToken, setRunnerRevealToken } from "../lib/job-session";
import { getCachedOnchainJobId, getCachedTxHashes, rememberTxHash } from "../lib/live-chain-cache";
import { ExplorerPanel } from "./explorer-panel";
import { FilePreviewGrid } from "./file-preview-grid";
import { JobTimeline } from "./job-timeline";
import { PolicyCard } from "./policy-card";
import { ProofMediaGallery } from "./proof-media-gallery";
import { VerificationCard } from "./verification-card";

const SelfQrPanel = dynamic(
  () => import("./self-qr-panel").then((module) => module.SelfQrPanel),
  { ssr: false }
);

export function RunnerJobDemo({
  initialJob,
  jobId,
  initialRevealToken,
  liveSelfMode = false
}: {
  initialJob: QueueJobView;
  jobId: string;
  initialRevealToken?: string;
  liveSelfMode?: boolean;
}) {
  const [job, setJob] = useState(initialJob);
  const [runnerAddress, setRunnerAddress] = useState(initialJob.acceptedRunnerAddress ?? initialJob.selectedRunnerAddress ?? "0xa11ce0000000000000000000000000000000001");
  const [verificationReference, setVerificationReference] = useState(`self-${jobId}`);
  const [selfSession, setSelfSession] = useState<SelfVerificationSessionView | null>(null);
  const [acceptState, setAcceptState] = useState<string>("Not accepted yet");
  const [revealToken, setRevealToken] = useState<string | undefined>(initialRevealToken);
  const [sendLiveTx, setSendLiveTx] = useState(false);
  const [onchainJobId, setOnchainJobId] = useState<string | null>(null);
  const [cachedTxHashes, setCachedTxHashes] = useState<Record<string, string>>({});
  const [proofInputs, setProofInputs] = useState<Record<string, string>>({});
  const [proofNotes, setProofNotes] = useState<Record<string, string>>({});
  const [proofFiles, setProofFiles] = useState<Record<string, File[]>>({});
  const [selectedBundle, setSelectedBundle] = useState<Awaited<ReturnType<typeof fetchProofBundle>> | null>(null);
  const nextProofStage = job.stages.find((stage) => stage.status === "pending-proof");
  const stickyAction = !job.acceptedRunnerAddress
    ? handleAccept
    : nextProofStage
      ? () => handleProofSubmit(nextProofStage.stageId ?? nextProofStage.key, nextProofStage.key, nextProofStage.sequence)
      : undefined;
  const nextActionCopy = !job.acceptedRunnerAddress
    ? "Verification must succeed before QueueKeeper reveals the exact destination."
    : nextProofStage
      ? "Submit the next proof bundle from the line to keep payout moving."
      : "No runner action is pending right now.";
  const nextActionLabel = !job.acceptedRunnerAddress
    ? liveSelfMode
      ? selfSession?.status === "verified"
        ? "Accept job"
        : selfSession
          ? "Finish Self verification"
          : "Start verification"
      : "Accept job"
    : nextProofStage
      ? `Submit ${nextProofStage.label}`
      : "Job complete";

  useEffect(() => {
    setOnchainJobId(getCachedOnchainJobId(jobId));
    setCachedTxHashes(getCachedTxHashes(jobId));
  }, [jobId]);

  useEffect(() => {
    if (initialRevealToken) {
      setRunnerRevealToken(jobId, initialRevealToken);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("revealToken");
        window.history.replaceState({}, "", url.toString());
      }
      return;
    }

    const storedRevealToken = getRunnerRevealToken(jobId);
    if (!storedRevealToken) {
      return;
    }

    setRevealToken(storedRevealToken);
    fetchDemoJob(jobId, "runner", storedRevealToken)
      .then((timelineJob) => setJob(timelineJob))
      .catch(() => {
        // Ignore stale session tokens and fall back to the public view.
      });
  }, [initialRevealToken, jobId]);

  useEffect(() => {
    if (!selfSession || selfSession.status !== "pending" || !selfSession.accessToken) return;
    const interval = window.setInterval(async () => {
      const next = await fetchSelfVerificationSession(selfSession.sessionId, selfSession.accessToken);
      setSelfSession(next);
      if (next.status === "verified") {
        setAcceptState(`Self verification succeeded · session ${next.sessionId}`);
      }
    }, 3000);
    return () => window.clearInterval(interval);
  }, [selfSession]);

  function arrayBufferToBase64(buffer: ArrayBuffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  async function handleAccept() {
    setAcceptState("Checking verification gate…");

    let txHash: string | undefined;
    if (sendLiveTx && onchainJobId) {
      try {
        const liveResult = await acceptLiveJob(onchainJobId, `self-${jobId}`);
        txHash = liveResult.txHash;
        rememberTxHash(jobId, "acceptJob", txHash);
        setCachedTxHashes((current) => ({ ...current, acceptJob: txHash as string }));
      } catch (error) {
        setAcceptState(`Live accept failed, continuing with the demo fallback: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    try {
      const accepted = await requestRunnerAcceptance({
        jobId,
        runnerAddress,
        verificationPayload: {
          reference: verificationReference,
          sessionId: liveSelfMode ? selfSession?.sessionId : undefined,
          mockVerified: liveSelfMode ? undefined : true
        },
        txHash
      });
      setJob(accepted.job);
      setRevealToken(accepted.acceptanceRecord.revealToken);
      setRunnerRevealToken(jobId, accepted.acceptanceRecord.revealToken);
      setAcceptState(`Accepted · verification ref ${accepted.acceptanceRecord.verificationReference}`);
    } catch (error) {
      setAcceptState(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleProofSubmit(stageId: string, stageKey: QueueStageKey, sequence?: number) {
    const proofHash = proofInputs[stageId] || makeDefaultProofHash(stageKey, `${jobId}-${sequence ?? 1}`);
    let txHash: string | undefined;

    if (sendLiveTx && onchainJobId) {
      try {
        const liveResult = await submitLiveProof(onchainJobId, stageKey, proofHash, sequence);
        txHash = liveResult.txHash;
        rememberTxHash(jobId, `proof:${stageId}`, txHash);
        setCachedTxHashes((current) => ({ ...current, [`proof:${stageId}`]: txHash as string }));
      } catch (error) {
        setAcceptState(`Live ${stageKey} proof failed, continuing with the demo fallback: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    try {
      const media = await Promise.all((proofFiles[stageId] ?? []).map(async (file) => ({
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        base64: arrayBufferToBase64(await file.arrayBuffer())
      })));
      const nextJob = await submitDemoProof(jobId, {
        stageId,
        stageKey,
        sequence,
        proofHash,
        note: proofNotes[stageId] ?? "",
        buyerVisibleSummary: proofNotes[stageId] ?? "",
        media,
        txHash
      }, revealToken);
      setJob(nextJob);
      setProofInputs((current) => ({ ...current, [stageId]: proofHash }));
      setAcceptState(`${nextJob.stages.find((stage) => stage.stageId === stageId)?.label} proof stored.`);
    } catch (error) {
      setAcceptState(error instanceof Error ? error.message : String(error));
    }
  }

  const explorerLinks = [
    ...job.explorerLinks,
    ...buildTxExplorerLinks([
      { label: "Live accept tx", txHash: cachedTxHashes.acceptJob },
      ...job.stages.map((stage) => ({
        label: `Live ${stage.label} proof tx`,
        txHash: stage.stageId ? cachedTxHashes[`proof:${stage.stageId}`] : undefined
      }))
    ])
  ];

  return (
    <main className="container">
      <div className="runner-shell fade-in">
        <section className="card">
          <span className="badge-pill">Runner flow · mobile first</span>
          <h1 className="section-title">{job.title}</h1>
          <div className="summary-grid">
            <div className="summary-tile">
              <span className="eyebrow">Coarse area</span>
              <strong>{job.coarseArea}</strong>
            </div>
            <div className="summary-tile">
              <span className="eyebrow">Current stage</span>
              <strong>{job.currentStage}</strong>
            </div>
            <div className="summary-tile">
              <span className="eyebrow">Payout progress</span>
              <strong>{job.payoutSummary}</strong>
            </div>
            <div className="summary-tile">
              <span className="eyebrow">Next action</span>
              <strong>{nextActionLabel}</strong>
            </div>
          </div>
        </section>

        <VerificationCard verification={job.runnerVerification} />

        <section className="card next-action-card">
          <span className="eyebrow">Exact destination reveal</span>
          <h2 className="section-title">Only unlocked after verified acceptance</h2>
          <p className="muted">
            {job.exactLocationVisibleToViewer
              ? `Unlocked: ${job.exactLocationVisibleToViewer}`
              : job.exactLocationHint ?? "Hidden until verified acceptance."}
          </p>
        </section>

        <section className="card next-action-card">
          <span className="eyebrow">Next required action</span>
          <h2 className="section-title">{nextActionLabel}</h2>
          <p className="muted">{nextActionCopy}</p>
          <label className="field">
            <span>Runner address</span>
            <input className="input" value={runnerAddress} onChange={(event) => setRunnerAddress(event.target.value)} />
          </label>
          <label className="field">
            <span>Verification reference</span>
            <input className="input" value={verificationReference} onChange={(event) => setVerificationReference(event.target.value)} />
          </label>
          {liveSelfMode ? (
            <div className="stack" style={{ gap: 14 }}>
              <button
                className="button"
                onClick={async () => {
                  const session = await createSelfVerificationSession(jobId, runnerAddress);
                  setSelfSession(session);
                  setAcceptState(`Self verification session created · ${session.sessionId}`);
                }}
                type="button"
              >
                Start verification
              </button>
              {selfSession ? (
                <SelfQrPanel
                  onError={(error) => setAcceptState(error instanceof Error ? error.message : String(error))}
                  onSuccess={async () => setSelfSession(await fetchSelfVerificationSession(selfSession.sessionId, selfSession.accessToken))}
                  session={selfSession}
                />
              ) : null}
            </div>
          ) : null}
          <label className="checkbox-row">
            <input checked={sendLiveTx} onChange={(event) => setSendLiveTx(event.target.checked)} type="checkbox" />
            <span>Also try the live escrow contract if an onchain job id is cached in this browser.</span>
          </label>
          <div className="status-banner">{acceptState}</div>
        </section>

        <section className="card">
          <span className="eyebrow">Proof composer</span>
          <h2 className="section-title">Send proof bundles from the line</h2>
          <div className="grid">
            {job.stages.map((stage) => (
              <div key={stage.stageId ?? `${stage.key}-${stage.sequence}`} className="timeline-item">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div className="stack" style={{ gap: 4 }}>
                    <strong>{stage.label}</strong>
                    <span className="muted">{stage.amount}</span>
                  </div>
                  <span className={`chip ${stage.status === "disputed" ? "danger" : stage.released ? "success" : stage.status === "pending-proof" ? "info" : "warning"}`}>
                    {stage.status}
                  </span>
                </div>
                <div className="grid" style={{ marginTop: 12 }}>
                  <label className="field">
                    <span>Proof hash</span>
                    <input
                      className="input"
                      value={proofInputs[stage.stageId ?? stage.key] ?? ""}
                      onChange={(event) => setProofInputs((current) => ({ ...current, [stage.stageId ?? stage.key]: event.target.value }))}
                      placeholder={`0x ${stage.key} proof hash`}
                    />
                  </label>
                  <label className="field">
                    <span>Proof note</span>
                    <textarea
                      className="textarea"
                      value={proofNotes[stage.stageId ?? stage.key] ?? ""}
                      onChange={(event) => setProofNotes((current) => ({ ...current, [stage.stageId ?? stage.key]: event.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Image proofs</span>
                    <input
                      className="input"
                      accept="image/*"
                      multiple
                      onChange={(event) => setProofFiles((current) => ({ ...current, [stage.stageId ?? stage.key]: Array.from(event.target.files ?? []) }))}
                      type="file"
                    />
                  </label>
                  {proofFiles[stage.stageId ?? stage.key]?.length ? (
                    <FilePreviewGrid files={proofFiles[stage.stageId ?? stage.key] ?? []} />
                  ) : null}
                  <button
                    className="button"
                    disabled={!job.acceptedRunnerAddress || stage.status !== "pending-proof"}
                    onClick={() => handleProofSubmit(stage.stageId ?? stage.key, stage.key, stage.sequence)}
                    type="button"
                  >
                    Submit {stage.label}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <span className="eyebrow">Payout and receipt</span>
          <h2 className="section-title">What has been released</h2>
          <div className="summary-grid">
            <div className="summary-tile">
              <span className="eyebrow">Released</span>
              <strong>{job.payoutSummary}</strong>
            </div>
            <div className="summary-tile">
              <span className="eyebrow">Live chain cache</span>
              <strong>{onchainJobId ?? "none"}</strong>
            </div>
          </div>
        </section>

        {(job.stages.some((stage) => stage.proofBundleAvailable) || selectedBundle) ? (
          <section className="card">
            <span className="eyebrow">Proof history</span>
            <h2 className="section-title">Open previously submitted bundles</h2>
            <div className="grid">
              {job.stages.filter((stage) => stage.proofBundleAvailable && stage.stageId).map((stage) => (
                <button
                  key={stage.stageId}
                  className="button secondary"
                  onClick={async () => revealToken && stage.stageId && setSelectedBundle(await fetchProofBundle(jobId, stage.stageId, revealToken))}
                  type="button"
                >
                  Open {stage.label}
                </button>
              ))}
              {selectedBundle ? (
                <div className="card alt">
                  <strong>{selectedBundle.stageKey} bundle</strong>
                  <div className="summary-grid" style={{ marginTop: 12 }}>
                    <div className="summary-tile">
                      <span className="eyebrow">Created</span>
                      <strong>{selectedBundle.createdAt}</strong>
                    </div>
                    <div className="summary-tile">
                      <span className="eyebrow">Proof hash</span>
                      <strong className="mono-value">{selectedBundle.proofHash}</strong>
                    </div>
                  </div>
                  <div className="muted" style={{ marginTop: 8 }}>{selectedBundle.note ?? "No note provided."}</div>
                  <div style={{ marginTop: 12 }}>
                    <ProofMediaGallery media={selectedBundle.media} title="Runner proof history" />
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <PolicyCard policy={job.policy} />

        <details className="detail-disclosure">
          <summary>What remains private</summary>
          <ul className="muted" style={{ marginTop: 12, paddingLeft: 18 }}>
            {job.keptPrivate.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </details>

        <JobTimeline job={job} />
        <ExplorerPanel links={explorerLinks} />

        <div className="sticky-footer">
          <button
            className="button"
            disabled={!job.acceptedRunnerAddress && liveSelfMode && selfSession?.status !== "verified"}
            onClick={stickyAction}
            type="button"
          >
            {nextActionLabel}
          </button>
        </div>
      </div>
    </main>
  );
}
