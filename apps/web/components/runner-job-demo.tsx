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
import { resolveAddressOrEns, useEnsIdentity } from "../lib/ens";
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

type NextRunnerAction =
  | "start-verification"
  | "finish-verification"
  | "accept-task"
  | "submit-proof"
  | "wait";

function resolveRunnerAction(
  job: QueueJobView,
  liveSelfMode: boolean,
  selfSession: SelfVerificationSessionView | null,
  nextProofStage: QueueJobView["stages"][number] | undefined
): {
  kind: NextRunnerAction;
  label: string;
  body: string;
} {
  if (!job.acceptedRunnerAddress) {
    if (!liveSelfMode) {
      return {
        kind: "accept-task",
        label: "Accept task",
        body: "Verification is mocked in this mode, so acceptance can proceed immediately."
      };
    }
    if (!selfSession) {
      return {
        kind: "start-verification",
        label: "Start verification",
        body: "Verification must succeed before the exact destination and private instructions unlock."
      };
    }
    if (selfSession.status !== "verified") {
      return {
        kind: "finish-verification",
        label: "Finish Self verification",
        body: "Complete the QR or deeplink flow in Self, then come back to accept the task."
      };
    }
    return {
      kind: "accept-task",
      label: "Accept task",
      body: "Verification has cleared, so the task can now unlock reveal access."
    };
  }

  if (nextProofStage) {
    return {
      kind: "submit-proof",
      label: `Submit ${nextProofStage.label}`,
      body: "Only the next proof-backed increment is payable, so submit the next proof from the line."
    };
  }

  return {
    kind: "wait",
    label: "No runner action pending",
    body: "All currently configured runner actions are complete or waiting on the principal."
  };
}

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
  const [acceptState, setAcceptState] = useState("Not accepted yet");
  const [revealToken, setRevealToken] = useState<string | undefined>(initialRevealToken);
  const [sendLiveTx, setSendLiveTx] = useState(false);
  const [onchainJobId, setOnchainJobId] = useState<string | null>(null);
  const [cachedTxHashes, setCachedTxHashes] = useState<Record<string, string>>({});
  const [proofInputs, setProofInputs] = useState<Record<string, string>>({});
  const [proofNotes, setProofNotes] = useState<Record<string, string>>({});
  const [proofFiles, setProofFiles] = useState<Record<string, File[]>>({});
  const [selectedBundle, setSelectedBundle] = useState<Awaited<ReturnType<typeof fetchProofBundle>> | null>(null);
  const runnerIdentity = useEnsIdentity(runnerAddress);
  const nextProofStage = job.stages.find((stage) => stage.status === "pending-proof");
  const nextAction = resolveRunnerAction(job, liveSelfMode, selfSession, nextProofStage);
  const needsRunnerIdentitySetup = !job.acceptedRunnerAddress;

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

  async function startVerification() {
    const resolvedRunner = await resolveAddressOrEns(runnerAddress);
    if (!resolvedRunner.address) {
      setAcceptState(resolvedRunner.error ?? "Enter a valid EVM address or .eth name.");
      return;
    }
    const session = await createSelfVerificationSession(jobId, resolvedRunner.address);
    setSelfSession(session);
    setAcceptState(`Self verification session created · ${session.sessionId}`);
  }

  async function handleAccept() {
    setAcceptState("Checking verification gate…");
    const resolvedRunner = await resolveAddressOrEns(runnerAddress);
    if (!resolvedRunner.address) {
      setAcceptState(resolvedRunner.error ?? "Enter a valid EVM address or .eth name.");
      return;
    }

    let txHash: string | undefined;
    if (sendLiveTx && onchainJobId) {
      try {
        const liveResult = await acceptLiveJob(onchainJobId, `self-${jobId}`);
        txHash = liveResult.txHash;
        rememberTxHash(jobId, "acceptJob", txHash);
        setCachedTxHashes((current) => ({ ...current, acceptJob: txHash as string }));
      } catch (error) {
        setAcceptState(`Live accept failed, continuing with the hosted path: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    try {
      const accepted = await requestRunnerAcceptance({
        jobId,
        runnerAddress: resolvedRunner.address,
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
        setAcceptState(`Live ${stageKey} proof failed, continuing with the hosted path: ${error instanceof Error ? error.message : String(error)}`);
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
              <strong>{nextAction.label}</strong>
            </div>
          </div>
        </section>

        {needsRunnerIdentitySetup ? (
          <section className="card">
            <div className="action-row">
              <div className="stack-tight">
                <span className="eyebrow">Runner identity</span>
                <h2 className="section-title">Who is taking the task</h2>
              </div>
              <span className="chip info">Standard flow</span>
            </div>
            <div className="field-grid" style={{ marginTop: 12 }}>
              <label className="field">
                <span>Runner address or ENS</span>
                <input className="input" value={runnerAddress} onChange={(event) => setRunnerAddress(event.target.value)} />
                <span className="muted">
                  {runnerIdentity.ensName
                    ? `Resolved ENS: ${runnerIdentity.ensName}`
                    : runnerIdentity.address
                      ? `Resolved address: ${runnerIdentity.address}`
                      : runnerIdentity.error ?? "Enter a 0x address or .eth name."}
                </span>
              </label>
              <label className="field">
                <span>Verification reference</span>
                <input className="input" value={verificationReference} onChange={(event) => setVerificationReference(event.target.value)} />
                <span className="muted">The default demo runner address works as-is for the hosted flow.</span>
              </label>
            </div>
            <label className="checkbox-row" style={{ marginTop: 12 }}>
              <input checked={sendLiveTx} onChange={(event) => setSendLiveTx(event.target.checked)} type="checkbox" />
              <span>Also try the live escrow contract if an onchain job id is cached in this browser.</span>
            </label>
          </section>
        ) : null}

        <VerificationCard verification={job.runnerVerification} />
        {liveSelfMode && selfSession ? (
          <div className="card">
            <span className="eyebrow">Finish verification</span>
            <SelfQrPanel
              onError={(error) => setAcceptState(error instanceof Error ? error.message : String(error))}
              onSuccess={async () => setSelfSession(await fetchSelfVerificationSession(selfSession.sessionId, selfSession.accessToken))}
              session={selfSession}
            />
          </div>
        ) : null}

        <section className={`card ${job.exactLocationVisibleToViewer ? "reveal-card unlocked" : "reveal-card locked"}`}>
          <div className="action-row">
            <div className="stack-tight">
              <span className="eyebrow">Privacy boundary</span>
              <h2 className="section-title">What unlocks after verification</h2>
            </div>
            <span className={`chip ${job.exactLocationVisibleToViewer ? "success" : "info"}`}>
              {job.exactLocationVisibleToViewer ? "Unlocked" : "Still locked"}
            </span>
          </div>
          <p className="muted">
            {job.exactLocationVisibleToViewer
              ? job.exactLocationVisibleToViewer
              : "Exact destination, buyer notes, and handoff instructions unlock only after verified acceptance."}
          </p>
        </section>

        <section className="card next-action-card dominant-card">
          <div className="action-row">
            <div className="stack-tight">
              <span className="eyebrow">Next required action</span>
              <h2 className="section-title">{nextAction.label}</h2>
            </div>
            <span className="chip info">{liveSelfMode ? "Self + proof flow" : "Hosted demo flow"}</span>
          </div>
          <p className="muted">{nextAction.body}</p>
          {nextAction.kind === "start-verification" ? (
            <button className="button" onClick={startVerification} type="button">Start verification</button>
          ) : null}
          {nextAction.kind === "accept-task" ? (
            <button className="button" onClick={handleAccept} type="button">Accept task</button>
          ) : null}
          {nextAction.kind === "submit-proof" && nextProofStage ? (
            <div className="stack" style={{ gap: 14 }}>
              <div className="summary-tile">
                <span className="eyebrow">Next paid increment</span>
                <strong>{nextProofStage.label} · {nextProofStage.amount}</strong>
              </div>
              <label className="field">
                <span>Proof note</span>
                <textarea
                  className="textarea"
                  value={proofNotes[nextProofStage.stageId ?? nextProofStage.key] ?? ""}
                  onChange={(event) => setProofNotes((current) => ({ ...current, [nextProofStage.stageId ?? nextProofStage.key]: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Image proofs</span>
                <input
                  className="input"
                  accept="image/*"
                  multiple
                  onChange={(event) => setProofFiles((current) => ({ ...current, [nextProofStage.stageId ?? nextProofStage.key]: Array.from(event.target.files ?? []) }))}
                  type="file"
                />
              </label>
              {proofFiles[nextProofStage.stageId ?? nextProofStage.key]?.length ? (
                <FilePreviewGrid files={proofFiles[nextProofStage.stageId ?? nextProofStage.key] ?? []} />
              ) : null}
              <button
                className="button"
                onClick={() => handleProofSubmit(nextProofStage.stageId ?? nextProofStage.key, nextProofStage.key, nextProofStage.sequence)}
                type="button"
              >
                Submit {nextProofStage.label}
              </button>
            </div>
          ) : null}
          <div className="status-banner" style={{ marginTop: 14 }}>{acceptState}</div>
        </section>

        <section className="card">
          <div className="action-row">
            <div className="stack-tight">
              <span className="eyebrow">Celo micropayment rail</span>
              <h2 className="section-title">Payout progress</h2>
            </div>
            <span className="chip success">Receipts stay visible</span>
          </div>
          <div className="summary-grid">
            <div className="summary-tile">
              <span className="eyebrow">Released</span>
              <strong>{job.payoutSummary}</strong>
            </div>
            <div className="summary-tile">
              <span className="eyebrow">Cached onchain job</span>
              <strong>{onchainJobId ?? "none"}</strong>
            </div>
          </div>
        </section>

        <details className="detail-disclosure">
          <summary>Advanced details</summary>
          <div className="stack" style={{ gap: 16, marginTop: 14 }}>
            <details className="detail-disclosure">
              <summary>All stage status</summary>
              <div className="grid" style={{ marginTop: 14 }}>
                {job.stages.map((stage) => (
                  <div key={stage.stageId ?? `${stage.key}-${stage.sequence}`} className="timeline-item">
                    <div className="action-row">
                      <div className="stack-tight">
                        <strong>{stage.label}</strong>
                        <span className="muted">{stage.amount}</span>
                      </div>
                      <span className={`chip ${stage.status === "disputed" ? "danger" : stage.released ? "success" : stage.status === "pending-proof" ? "info" : "warning"}`}>
                        {stage.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </details>

            {(job.stages.some((stage) => stage.proofBundleAvailable) || selectedBundle) ? (
              <section className="card alt">
                <span className="eyebrow">Proof history</span>
                <h3 className="section-title">Open previously submitted bundles</h3>
                <div className="grid" style={{ marginTop: 12 }}>
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
                </div>
                {selectedBundle ? (
                  <div style={{ marginTop: 14 }}>
                    <div className="summary-grid">
                      <div className="summary-tile">
                        <span className="eyebrow">Created</span>
                        <strong>{selectedBundle.createdAt}</strong>
                      </div>
                      <div className="summary-tile">
                        <span className="eyebrow">Proof hash</span>
                        <strong className="mono-value">{selectedBundle.proofHash}</strong>
                      </div>
                    </div>
                    <div className="muted" style={{ marginTop: 10 }}>{selectedBundle.note ?? "No note provided."}</div>
                    <div style={{ marginTop: 12 }}>
                      <ProofMediaGallery media={selectedBundle.media} title="Runner proof history" />
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            <details className="detail-disclosure">
              <summary>What remains private</summary>
              <ul className="muted" style={{ marginTop: 12, paddingLeft: 18 }}>
                {job.keptPrivate.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </details>

            <PolicyCard policy={job.policy} />
            <JobTimeline job={job} />
            <ExplorerPanel links={explorerLinks} />
          </div>
        </details>

        <div className="sticky-footer">
          <button
            className="button"
            disabled={nextAction.kind === "finish-verification" || nextAction.kind === "wait"}
            onClick={() => {
              if (nextAction.kind === "start-verification") {
                void startVerification();
              } else if (nextAction.kind === "accept-task") {
                void handleAccept();
              } else if (nextAction.kind === "submit-proof" && nextProofStage) {
                void handleProofSubmit(nextProofStage.stageId ?? nextProofStage.key, nextProofStage.key, nextProofStage.sequence);
              }
            }}
            type="button"
          >
            {nextAction.label}
          </button>
        </div>
      </div>
    </main>
  );
}
