"use client";

import { useEffect, useState } from "react";
import type { QueueJobView, QueueStageKey } from "@queuekeeper/shared";
import {
  fetchProofBundle,
  makeDefaultProofHash,
  requestRunnerAcceptance,
  submitDemoProof
} from "../lib/agent-client";
import { acceptLiveJob, submitLiveProof } from "../lib/chain-client";
import { buildTxExplorerLinks } from "../lib/explorer";
import { getCachedOnchainJobId, getCachedTxHashes, rememberTxHash } from "../lib/live-chain-cache";
import { ExplorerPanel } from "./explorer-panel";
import { JobTimeline } from "./job-timeline";
import { PolicyCard } from "./policy-card";
import { VerificationCard } from "./verification-card";

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
  const [verificationProof, setVerificationProof] = useState("");
  const [verificationPublicSignals, setVerificationPublicSignals] = useState("");
  const [verificationAttestationId, setVerificationAttestationId] = useState("1");
  const [verificationUserContextData, setVerificationUserContextData] = useState("");
  const [acceptState, setAcceptState] = useState<string>("Not accepted yet");
  const [revealToken, setRevealToken] = useState<string | undefined>(initialRevealToken);
  const [sendLiveTx, setSendLiveTx] = useState(false);
  const [onchainJobId, setOnchainJobId] = useState<string | null>(null);
  const [cachedTxHashes, setCachedTxHashes] = useState<Record<string, string>>({});
  const [proofInputs, setProofInputs] = useState<Record<string, string>>({});
  const [proofNotes, setProofNotes] = useState<Record<string, string>>({});
  const [proofFiles, setProofFiles] = useState<Record<string, File[]>>({});
  const [selectedBundle, setSelectedBundle] = useState<Awaited<ReturnType<typeof fetchProofBundle>> | null>(null);

  useEffect(() => {
    setOnchainJobId(getCachedOnchainJobId(jobId));
    setCachedTxHashes(getCachedTxHashes(jobId));
  }, [jobId]);

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
          mockVerified: liveSelfMode ? undefined : true,
          proof: verificationProof || undefined,
          publicSignals: verificationPublicSignals || undefined,
          attestationId: verificationAttestationId || undefined,
          userContextData: verificationUserContextData || undefined
        },
        txHash
      });
      setJob(accepted.job);
      setRevealToken(accepted.acceptanceRecord.revealToken);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("revealToken", accepted.acceptanceRecord.revealToken);
        window.history.replaceState({}, "", url.toString());
      }
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
        const liveResult = await submitLiveProof(onchainJobId, stageKey, proofHash);
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
    <main className="container grid">
      <section className="card">
        <span className="badge">Runner view · mobile first</span>
        <h1>{job.title}</h1>
        <p className="muted">Job #{jobId} · {job.coarseArea}</p>
        <p className="muted">
          Exact destination: {job.exactLocationVisibleToViewer ?? job.exactLocationHint ?? "Hidden until verified acceptance"}
        </p>
        <p className="muted">Cached onchain job id: {onchainJobId ?? "none"}</p>
      </section>

      <VerificationCard verification={job.runnerVerification} />

      <section className="card">
        <h2>Accept job</h2>
        <p className="muted">
          The demo backend verifies the runner first, then reveals the exact location only in the accepted runner response token path.
        </p>
        <div className="grid">
          <label className="field">
            <span>Runner address</span>
            <input className="input" value={runnerAddress} onChange={(event) => setRunnerAddress(event.target.value)} />
          </label>
          <label className="field">
            <span>Verification reference</span>
            <input className="input" value={verificationReference} onChange={(event) => setVerificationReference(event.target.value)} />
          </label>
          {liveSelfMode ? (
            <>
              <label className="field">
                <span>Self proof</span>
                <textarea className="textarea" value={verificationProof} onChange={(event) => setVerificationProof(event.target.value)} />
              </label>
              <label className="field">
                <span>Self publicSignals JSON</span>
                <textarea className="textarea" value={verificationPublicSignals} onChange={(event) => setVerificationPublicSignals(event.target.value)} />
              </label>
              <label className="field">
                <span>Self attestationId</span>
                <input className="input" value={verificationAttestationId} onChange={(event) => setVerificationAttestationId(event.target.value)} />
              </label>
              <label className="field">
                <span>Self userContextData</span>
                <input className="input" value={verificationUserContextData} onChange={(event) => setVerificationUserContextData(event.target.value)} />
              </label>
            </>
          ) : null}
          <label className="checkbox-row">
            <input checked={sendLiveTx} onChange={(event) => setSendLiveTx(event.target.checked)} type="checkbox" />
            <span>Also try the live escrow contract if an onchain job id is cached in this browser.</span>
          </label>
          {liveSelfMode ? (
            <div className="muted">
              Live Self verification is enabled. Acceptance will use the proof package above; the mock verifier is not used in this mode.
            </div>
          ) : (
            <div className="muted">
              Mock Self verification is enabled locally. Acceptance uses the demo verifier unless you switch the env to live mode.
            </div>
          )}
          <button
            className="button"
            disabled={liveSelfMode && (!verificationProof.trim() || !verificationPublicSignals.trim() || !verificationAttestationId.trim() || !verificationUserContextData.trim())}
            onClick={handleAccept}
            type="button"
          >
            Accept and reveal exact location
          </button>
          <div className="muted">{acceptState}</div>
        </div>
      </section>

      <section className="card">
        <h2>Submit encrypted proof bundles</h2>
        <p className="muted">
          Each stage accepts a proof hash plus optional encrypted image bundle. Heartbeats can repeat, and the buyer can review the decrypted bundle inside the app.
        </p>
        <div className="grid">
          {job.stages.map((stage) => (
            <div key={stage.stageId ?? `${stage.key}-${stage.sequence}`} className="grid" style={{ gap: 8 }}>
              <label className="field">
                <span>{stage.label} proof hash</span>
                <input
                  className="input"
                  value={proofInputs[stage.stageId ?? stage.key] ?? ""}
                  onChange={(event) => setProofInputs((current) => ({ ...current, [stage.stageId ?? stage.key]: event.target.value }))}
                  placeholder={`0x ${stage.key} proof hash`}
                />
              </label>
              <label className="field">
                <span>Buyer-visible proof note</span>
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
                  multiple
                  onChange={(event) => setProofFiles((current) => ({ ...current, [stage.stageId ?? stage.key]: Array.from(event.target.files ?? []) }))}
                  type="file"
                />
              </label>
              <button className="button" onClick={() => handleProofSubmit(stage.stageId ?? stage.key, stage.key, stage.sequence)} type="button">
                Submit {stage.label} bundle
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Review proof bundle</h2>
        <div className="grid">
          {job.stages.filter((stage) => stage.proofBundleAvailable && stage.stageId).map((stage) => (
            <button
              key={stage.stageId}
              className="button"
              onClick={async () => revealToken && stage.stageId && setSelectedBundle(await fetchProofBundle(jobId, stage.stageId, revealToken))}
              type="button"
            >
              Open {stage.label} bundle
            </button>
          ))}
          {selectedBundle ? (
            <div className="card">
              <strong>{selectedBundle.stageKey} bundle</strong>
              <div className="muted" style={{ marginTop: 8 }}>{selectedBundle.note ?? "No note provided."}</div>
              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: 12 }}>
                {selectedBundle.media.map((media) => (
                  <img key={media.filename} alt={media.filename} src={media.dataUrl} style={{ width: "100%", borderRadius: 12 }} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <PolicyCard policy={job.policy} />

      <section className="card">
        <h3>What is still private</h3>
        <ul>
          {job.keptPrivate.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <JobTimeline job={job} />
      <ExplorerPanel links={explorerLinks} />
    </main>
  );
}
