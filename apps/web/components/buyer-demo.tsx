"use client";

import { useEffect, useState } from "react";
import type { BuyerJobFormInput, QueueJobView, QueueStageKey } from "@queuekeeper/shared";
import {
  approveDemoStage,
  createAndPostJob,
  disputeDemoStage,
  fetchProofBundle,
  requestPlannerPreview
} from "../lib/agent-client";
import { createLiveJob, releaseLiveStage } from "../lib/chain-client";
import { buildTxExplorerLinks } from "../lib/explorer";
import { getBuyerToken, setBuyerToken } from "../lib/job-session";
import { getCachedOnchainJobId, getCachedTxHashes, rememberTxHash, setCachedOnchainJobId } from "../lib/live-chain-cache";
import { ExplorerPanel } from "./explorer-panel";
import { JobTimeline } from "./job-timeline";
import { PolicyCard } from "./policy-card";
import { WalletPanel } from "./wallet-panel";

type BuyerDemoProps = {
  initialDraft: BuyerJobFormInput;
  initialJob: QueueJobView | null;
};

type PlannerState = {
  loading: boolean;
  result?: string;
  error?: string;
  selectedRunnerAddress?: string;
  provider?: string;
  providerReason?: string;
};

type FormErrors = Partial<Record<keyof BuyerJobFormInput, string>>;

export function BuyerDemo({ initialDraft, initialJob }: BuyerDemoProps) {
  const [form, setForm] = useState<BuyerJobFormInput>(initialDraft);
  const [job, setJob] = useState<QueueJobView | null>(initialJob);
  const [buyerToken, setBuyerTokenState] = useState<string | null>(null);
  const [plannerState, setPlannerState] = useState<PlannerState>({
    loading: false,
    selectedRunnerAddress: initialJob?.selectedRunnerAddress ?? initialDraft.selectedRunnerAddress
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [statusMessage, setStatusMessage] = useState<string>("No funded job yet.");
  const [sendLiveTx, setSendLiveTx] = useState(false);
  const [onchainJobId, setOnchainJobId] = useState<string | null>(null);
  const [cachedTxHashes, setCachedTxHashes] = useState<Record<string, string>>({});
  const [selectedProofBundle, setSelectedProofBundle] = useState<Awaited<ReturnType<typeof fetchProofBundle>> | null>(null);

  useEffect(() => {
    if (!job?.id) {
      setOnchainJobId(null);
      setCachedTxHashes({});
      setBuyerTokenState(null);
      return;
    }

    setOnchainJobId(getCachedOnchainJobId(job.id));
    setCachedTxHashes(getCachedTxHashes(job.id));
    setBuyerTokenState(getBuyerToken(job.id));
  }, [job?.id]);

  function updateForm<K extends keyof BuyerJobFormInput>(key: K, value: BuyerJobFormInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFormErrors((current) => ({ ...current, [key]: undefined }));
  }

  function validateForm(): BuyerJobFormInput | null {
    const nextErrors: FormErrors = {};
    const trimmedTitle = form.title.trim();
    const trimmedArea = form.coarseArea.trim();
    const trimmedExactLocation = form.exactLocation.trim();

    if (!trimmedTitle) nextErrors.title = "Title is required.";
    if (!trimmedArea) nextErrors.coarseArea = "Coarse area is required.";
    if (!trimmedExactLocation) nextErrors.exactLocation = "Exact destination is required.";
    if (form.maxSpendUsd <= 0) nextErrors.maxSpendUsd = "Max spend must be positive.";
    if (form.scoutFeeUsd <= 0) nextErrors.scoutFeeUsd = "Scout fee must be positive.";
    if (form.arrivalFeeUsd <= 0) nextErrors.arrivalFeeUsd = "Arrival fee must be positive.";
    if (form.heartbeatFeeUsd <= 0) nextErrors.heartbeatFeeUsd = "Heartbeat fee must be positive.";
    if (form.completionFeeUsd <= 0) nextErrors.completionFeeUsd = "Completion fee must be positive.";
    if (form.expiresInMinutes < 15) nextErrors.expiresInMinutes = "Use at least 15 minutes.";
    if ((form.heartbeatCount ?? 3) < 1) nextErrors.heartbeatCount = "At least one heartbeat is required.";
    if ((form.heartbeatIntervalSeconds ?? 300) < 60) nextErrors.heartbeatIntervalSeconds = "Use at least 60 seconds.";

    const stagedTotal = form.scoutFeeUsd + form.arrivalFeeUsd + form.heartbeatFeeUsd + form.completionFeeUsd;
    if (stagedTotal > form.maxSpendUsd) {
      nextErrors.maxSpendUsd = "Max spend must cover all staged payouts.";
    }

    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return null;
    }

    return {
      ...form,
      title: trimmedTitle,
      coarseArea: trimmedArea,
      exactLocation: trimmedExactLocation,
      hiddenNotes: form.hiddenNotes.trim()
    };
  }

  async function handlePlannerPreview() {
    const validForm = validateForm();
    if (!validForm) {
      setPlannerState({
        loading: false,
        error: "Fix the required form fields before previewing the planner decision."
      });
      return;
    }

    setPlannerState({ loading: true });
    try {
      const preview = await requestPlannerPreview(validForm);
      setPlannerState({
        loading: false,
        result: `${preview.action} · ${preview.reason}${preview.selectedRunnerAddress ? ` · runner ${preview.selectedRunnerAddress}` : ""}`,
        selectedRunnerAddress: preview.selectedRunnerAddress,
        provider: preview.provider,
        providerReason: preview.providerReason
      });
      setForm((current) => ({
        ...current,
        plannerPreview: preview,
        selectedRunnerAddress: preview.selectedRunnerAddress ?? current.selectedRunnerAddress
      }));
    } catch (error) {
      setPlannerState({
        loading: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async function handleFundEscrow() {
    const validForm = validateForm();
    if (!validForm) {
      setStatusMessage("Fix the highlighted form fields before funding escrow.");
      return;
    }

    setStatusMessage("Creating or updating the demo job…");
    try {
      const created = await createAndPostJob({
        ...validForm,
        mode: validForm.mode ?? "DIRECT_DISPATCH",
        plannerPreview: validForm.plannerPreview,
        selectedRunnerAddress: plannerState.selectedRunnerAddress ?? validForm.selectedRunnerAddress
      }, `${Date.now()}-${Math.random().toString(16).slice(2)}`);
      const nextJob = created.job;
      setJob(nextJob);
      setBuyerTokenState(created.buyerToken);
      setBuyerToken(nextJob.id, created.buyerToken);
      setForm((current) => ({
        ...current,
        id: nextJob.id,
        selectedRunnerAddress: nextJob.selectedRunnerAddress ?? current.selectedRunnerAddress
      }));

      let nextMessage = `Demo job ${nextJob.id} funded in the in-app store.`;

      if (sendLiveTx) {
        try {
          const liveResult = await createLiveJob(validForm, plannerState.selectedRunnerAddress ?? validForm.selectedRunnerAddress);
          setCachedOnchainJobId(nextJob.id, liveResult.onchainJobId);
          rememberTxHash(nextJob.id, "createJob", liveResult.txHash);
          setOnchainJobId(liveResult.onchainJobId);
          setCachedTxHashes((current) => ({ ...current, createJob: liveResult.txHash }));
          nextMessage += ` Live createJob tx captured with onchain job ${liveResult.onchainJobId}.`;
        } catch (error) {
          nextMessage += ` Live createJob failed, so the truthful demo stays on the in-app fallback: ${error instanceof Error ? error.message : String(error)}`;
        }
      }

      setStatusMessage(nextMessage);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to fund demo escrow.");
    }
  }

  async function handleRelease(stageId: string, stageKey: QueueStageKey) {
    if (!job || !buyerToken) {
      setStatusMessage("Fund a demo job before releasing payout stages.");
      return;
    }

    setStatusMessage(`Releasing ${stageKey} stage…`);
    try {
      let txHash: string | undefined;

      if (sendLiveTx && onchainJobId) {
        try {
          const liveResult = await releaseLiveStage(onchainJobId, stageKey);
          txHash = liveResult.txHash;
          rememberTxHash(job.id, `release:${stageKey}`, txHash);
          setCachedTxHashes((current) => ({ ...current, [`release:${stageKey}`]: txHash as string }));
        } catch (error) {
          setStatusMessage(`Demo release will continue, but the live ${stageKey} release failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      const nextJob = await approveDemoStage(job.id, {
        buyerToken,
        stageId,
        txHash
      });
      setJob(nextJob);
      setStatusMessage(`${nextJob.stages.find((stage) => stage.stageId === stageId)?.label} payout released.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Stage release failed.");
    }
  }

  async function handleDispute(stageId: string) {
    if (!job || !buyerToken) {
      setStatusMessage("Buyer token missing for dispute action.");
      return;
    }

    try {
      const nextJob = await disputeDemoStage(job.id, buyerToken, stageId, "Buyer disputed this stage from the dashboard.");
      setJob(nextJob);
      setStatusMessage(`Stage ${stageId} moved into dispute.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Dispute failed.");
    }
  }

  const explorerLinks = job
    ? [
        ...job.explorerLinks,
        ...buildTxExplorerLinks([
          { label: "Live createJob tx", txHash: cachedTxHashes.createJob },
          { label: "Live scout release tx", txHash: cachedTxHashes["release:scout"] },
          { label: "Live arrival release tx", txHash: cachedTxHashes["release:arrival"] },
          { label: "Live heartbeat release tx", txHash: cachedTxHashes["release:heartbeat"] },
          { label: "Live completion release tx", txHash: cachedTxHashes["release:completion"] }
        ])
      ]
    : [];

  return (
    <main className="container grid">
      <section className="card">
        <h1>Create job</h1>
        <p className="muted">
          Buyer flow for the MVP: fill the actual form, preview the private planner decision, request bounded delegation, and fund a real demo job in the in-app store.
        </p>
        <div className="grid">
          <label className="field">
            <span>Job title</span>
            <input className="input" value={form.title} onChange={(event) => updateForm("title", event.target.value)} />
            {formErrors.title ? <span className="error">{formErrors.title}</span> : null}
          </label>
          <label className="field">
            <span>Coarse area</span>
            <input className="input" value={form.coarseArea} onChange={(event) => updateForm("coarseArea", event.target.value)} />
            {formErrors.coarseArea ? <span className="error">{formErrors.coarseArea}</span> : null}
          </label>
          <label className="field">
            <span>Dispatch mode</span>
            <select className="input" value={form.mode ?? "DIRECT_DISPATCH"} onChange={(event) => updateForm("mode", event.target.value as BuyerJobFormInput["mode"])}>
              <option value="DIRECT_DISPATCH">Direct dispatch</option>
              <option value="VERIFIED_POOL">Verified pool</option>
            </select>
          </label>
          <label className="field">
            <span>Rough timing window</span>
            <input className="input" value={form.timingWindow ?? "Within the next 2 hours"} onChange={(event) => updateForm("timingWindow", event.target.value)} />
          </label>
          <label className="field">
            <span>Waiting tolerance (minutes)</span>
            <input className="input" inputMode="numeric" type="number" value={form.waitingToleranceMinutes ?? 10} onChange={(event) => updateForm("waitingToleranceMinutes", Number(event.target.value))} />
          </label>
          {(form.mode ?? "DIRECT_DISPATCH") === "DIRECT_DISPATCH" ? (
            <label className="field">
              <span>Dispatch runner address</span>
              <input className="input" value={form.selectedRunnerAddress ?? ""} onChange={(event) => updateForm("selectedRunnerAddress", event.target.value)} />
            </label>
          ) : null}
          <label className="field">
            <span>Exact destination</span>
            <textarea
              className="textarea"
              value={form.exactLocation}
              onChange={(event) => updateForm("exactLocation", event.target.value)}
            />
            {formErrors.exactLocation ? <span className="error">{formErrors.exactLocation}</span> : null}
          </label>
          <label className="field">
            <span>Hidden notes / fallback rules</span>
            <textarea className="textarea" value={form.hiddenNotes} onChange={(event) => updateForm("hiddenNotes", event.target.value)} />
          </label>
          <label className="field">
            <span>Private fallback instructions</span>
            <textarea className="textarea" value={form.privateFallbackInstructions ?? ""} onChange={(event) => updateForm("privateFallbackInstructions", event.target.value)} />
          </label>
          <label className="field">
            <span>Sensitive buyer preferences</span>
            <textarea className="textarea" value={form.sensitiveBuyerPreferences ?? ""} onChange={(event) => updateForm("sensitiveBuyerPreferences", event.target.value)} />
          </label>
          <label className="field">
            <span>Handoff secret</span>
            <input className="input" value={form.handoffSecret ?? ""} onChange={(event) => updateForm("handoffSecret", event.target.value)} />
          </label>
          <div className="stage-row">
            <label className="field">
              <span>Max spend</span>
              <input className="input" inputMode="decimal" type="number" value={form.maxSpendUsd} onChange={(event) => updateForm("maxSpendUsd", Number(event.target.value))} />
              {formErrors.maxSpendUsd ? <span className="error">{formErrors.maxSpendUsd}</span> : null}
            </label>
            <label className="field">
              <span>Scout fee</span>
              <input className="input" inputMode="decimal" type="number" value={form.scoutFeeUsd} onChange={(event) => updateForm("scoutFeeUsd", Number(event.target.value))} />
              {formErrors.scoutFeeUsd ? <span className="error">{formErrors.scoutFeeUsd}</span> : null}
            </label>
            <label className="field">
              <span>Arrival fee</span>
              <input className="input" inputMode="decimal" type="number" value={form.arrivalFeeUsd} onChange={(event) => updateForm("arrivalFeeUsd", Number(event.target.value))} />
              {formErrors.arrivalFeeUsd ? <span className="error">{formErrors.arrivalFeeUsd}</span> : null}
            </label>
            <label className="field">
              <span>Heartbeat fee</span>
              <input className="input" inputMode="decimal" type="number" value={form.heartbeatFeeUsd} onChange={(event) => updateForm("heartbeatFeeUsd", Number(event.target.value))} />
              {formErrors.heartbeatFeeUsd ? <span className="error">{formErrors.heartbeatFeeUsd}</span> : null}
            </label>
            <label className="field">
              <span>Completion bonus</span>
              <input className="input" inputMode="decimal" type="number" value={form.completionFeeUsd} onChange={(event) => updateForm("completionFeeUsd", Number(event.target.value))} />
              {formErrors.completionFeeUsd ? <span className="error">{formErrors.completionFeeUsd}</span> : null}
            </label>
            <label className="field">
              <span>Expires in minutes</span>
              <input className="input" inputMode="numeric" type="number" value={form.expiresInMinutes} onChange={(event) => updateForm("expiresInMinutes", Number(event.target.value))} />
              {formErrors.expiresInMinutes ? <span className="error">{formErrors.expiresInMinutes}</span> : null}
            </label>
            <label className="field">
              <span>Heartbeat count</span>
              <input className="input" inputMode="numeric" type="number" value={form.heartbeatCount ?? 3} onChange={(event) => updateForm("heartbeatCount", Number(event.target.value))} />
              {formErrors.heartbeatCount ? <span className="error">{formErrors.heartbeatCount}</span> : null}
            </label>
            <label className="field">
              <span>Heartbeat interval (seconds)</span>
              <input className="input" inputMode="numeric" type="number" value={form.heartbeatIntervalSeconds ?? 300} onChange={(event) => updateForm("heartbeatIntervalSeconds", Number(event.target.value))} />
              {formErrors.heartbeatIntervalSeconds ? <span className="error">{formErrors.heartbeatIntervalSeconds}</span> : null}
            </label>
          </div>
          <label className="checkbox-row">
            <input checked={sendLiveTx} onChange={(event) => setSendLiveTx(event.target.checked)} type="checkbox" />
            <span>Also try live Celo Sepolia writes when a wallet is available. The demo store still remains the truthful fallback.</span>
          </label>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="button" onClick={handlePlannerPreview} type="button">Preview planner decision</button>
            <button className="button" onClick={handleFundEscrow} type="button">Fund escrow</button>
          </div>
          <div className="card">
            <strong>Planner preview</strong>
            <div className="muted" style={{ marginTop: 8 }}>
              {plannerState.loading ? "Loading private planner preview…" : plannerState.result ?? plannerState.error ?? "No planner preview yet."}
            </div>
            <div className="muted" style={{ marginTop: 8 }}>
              Provider: {plannerState.provider ?? "unknown"}
              {plannerState.providerReason ? ` · ${plannerState.providerReason}` : ""}
            </div>
            <div className="muted" style={{ marginTop: 8 }}>
              Selected runner: {plannerState.selectedRunnerAddress ?? "not chosen yet"}
            </div>
          </div>
          <div className="card">
            <strong>What stays private</strong>
            <div className="muted" style={{ marginTop: 8 }}>
              Exact destination, max budget, fallback rules, and handoff notes stay server-side until the verified accept path unlocks the destination reveal.
            </div>
          </div>
          <div className="card">
            <strong>Status</strong>
            <div className="muted" style={{ marginTop: 8 }}>{statusMessage}</div>
            <div className="muted" style={{ marginTop: 8 }}>
              Onchain job id cache: {onchainJobId ?? "none yet"}
            </div>
          </div>
        </div>
      </section>

      <WalletPanel
        connected={true}
        funded={Boolean(job)}
        jobId={job?.id}
        buyerToken={buyerToken}
        policy={job?.policy}
        onPolicyUpdated={setJob}
      />

      {job ? <PolicyCard policy={job.policy} /> : null}

      {job ? (
        <section className="card">
          <h3>Buyer release controls</h3>
          <p className="muted">
            Releases are sequential and require stored proof hashes. This MVP keeps a single heartbeat stage rather than repeated heartbeat releases.
          </p>
          <div className="grid">
            {job.stages.map((stage) => {
              if (!stage) return null;

              return (
                <div key={stage.stageId ?? `${stage.key}-${stage.sequence}`} className="action-row">
                  <div>
                    <strong>{stage.label}</strong>
                    <div className="muted">Proof status: {stage.status}</div>
                    <div className="muted">Auto-release: {stage.autoReleaseAt ?? "n/a"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <button
                      className="button"
                      disabled={stage.released || stage.proofHash === "pending" || !stage.stageId}
                      onClick={() => stage.stageId && handleRelease(stage.stageId, stage.key)}
                      type="button"
                    >
                      Approve {stage.label}
                    </button>
                    <button
                      className="button"
                      disabled={stage.proofHash === "pending" || !stage.stageId || stage.status === "disputed"}
                      onClick={() => stage.stageId && handleDispute(stage.stageId)}
                      type="button"
                    >
                      Dispute
                    </button>
                    <button
                      className="button"
                      disabled={!stage.proofBundleAvailable || !stage.stageId || !buyerToken}
                      onClick={async () => stage.stageId && buyerToken && setSelectedProofBundle(await fetchProofBundle(job.id, stage.stageId, buyerToken))}
                      type="button"
                    >
                      Review proof
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {job ? <JobTimeline job={job} /> : null}
      {selectedProofBundle ? (
        <section className="card">
          <h3>Buyer proof review</h3>
          <div className="muted">{selectedProofBundle.note ?? "No note provided."}</div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: 12 }}>
            {selectedProofBundle.media.map((media) => (
              <img key={media.filename} alt={media.filename} src={media.dataUrl} style={{ width: "100%", borderRadius: 12 }} />
            ))}
          </div>
        </section>
      ) : null}
      {job ? <ExplorerPanel links={explorerLinks} /> : null}
    </main>
  );
}
