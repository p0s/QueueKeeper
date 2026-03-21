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
import { ProofMediaGallery } from "./proof-media-gallery";
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

function plannerProviderLabel(provider?: string) {
  if (provider === "venice-live") return "Venice live";
  if (provider === "venice-fallback") return "Deterministic fallback";
  if (provider === "mock") return "Mock planner";
  return "Not previewed";
}

function plannerEffectLabel(action?: string) {
  if (action === "scout-only") return "Only the scout stage will be posted.";
  if (action === "scout-then-hold") return "Scout, arrival, heartbeat, and completion all stay active.";
  if (action === "hold-now") return "The job skips scout and starts with arrival plus heartbeat cover.";
  if (action === "abort") return "The planner recommends not posting until the private inputs change.";
  return "Planner output will shape the real stage path after preview.";
}

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

  const stagesNeedingReview = job?.stages.filter((stage) => stage.status === "submitted" || stage.status === "awaiting-release" || stage.status === "disputed") ?? [];
  const reviewQueue = (job?.stages ?? []).slice().sort((left, right) => {
    const priority = (status: string) => status === "disputed" ? 0 : status === "submitted" || status === "awaiting-release" ? 1 : 2;
    return priority(left.status) - priority(right.status);
  });
  const nextBuyerAction = stagesNeedingReview[0]?.status === "disputed"
    ? `Resolve ${stagesNeedingReview[0].label}`
    : stagesNeedingReview[0]
      ? `Review ${stagesNeedingReview[0].label}`
      : job
        ? "Monitor runner progress"
        : "Preview planner";
  const currentStep = !job
    ? plannerState.result ? 2 : 1
    : stagesNeedingReview.length > 0 || selectedProofBundle ? 4 : 3;

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
    <main className="container stack">
      <section className="stack fade-in">
        <div>
          <span className="eyebrow">Buyer operations</span>
          <h1 className="section-title">Plan, fund, dispatch, and review from one place.</h1>
          <p className="muted section-copy">
            QueueKeeper keeps private instructions server-side, shows only the buyer’s next action up front, and lets you approve or dispute proof-backed payouts without leaving the dashboard.
          </p>
        </div>
        <div className="step-rail">
          {[
            ["1. Plan", "Choose mode, timing, and private instructions."],
            ["2. Fund", "Preview the planner and lock the spend boundary."],
            ["3. Dispatch", "Send a verified runner or open to the verified pool."],
            ["4. Review", "Check proofs, approve payout, or dispute."]
          ].map(([title, copy], index) => (
            <div key={title} className={`step-item ${currentStep === index + 1 ? "active" : ""}`}>
              <strong>{title}</strong>
              <span className="muted">{copy}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="dashboard-grid">
        <div className="stack">
          <section className="card fade-in">
            <span className="eyebrow">Create or update job</span>
            <h2 className="section-title">Dispatch configuration</h2>
            <div className="form-sections">
              <div className="card alt section-card">
                <strong>Job basics</strong>
                <div className="field-grid">
                  <label className="field">
                    <span>Job title</span>
                    <input className="input" value={form.title} onChange={(event) => updateForm("title", event.target.value)} />
                    {formErrors.title ? <span className="error">{formErrors.title}</span> : null}
                  </label>
                  <label className="field">
                    <span>Visible to runners</span>
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
                </div>
              </div>

              <div className="card alt section-card">
                <strong>Private until accept</strong>
                <div className="field-grid">
                  <label className="field">
                    <span>Exact destination</span>
                    <textarea className="textarea" value={form.exactLocation} onChange={(event) => updateForm("exactLocation", event.target.value)} />
                    {formErrors.exactLocation ? <span className="error">{formErrors.exactLocation}</span> : null}
                  </label>
                  <label className="field">
                    <span>Hidden notes</span>
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
                </div>
              </div>

              <div className="card alt section-card">
                <strong>Payout schedule</strong>
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
              </div>

              <div className="card alt section-card">
                <strong>Planner and posting</strong>
                <label className="checkbox-row">
                  <input checked={sendLiveTx} onChange={(event) => setSendLiveTx(event.target.checked)} type="checkbox" />
                  <span>Attempt live Celo Sepolia writes when a wallet is available.</span>
                </label>
                <div className="cta-row">
                  <button className="button secondary" onClick={handlePlannerPreview} type="button">Preview planner decision</button>
                  <button className="button" onClick={handleFundEscrow} type="button">Fund and post job</button>
                </div>
              </div>
            </div>
          </section>

          {job ? (
            <section className="card fade-in">
              <span className="eyebrow">Review queue</span>
              <h2 className="section-title">What needs buyer action now</h2>
              <div className="grid">
                {reviewQueue.map((stage) => (
                  <div key={stage.stageId ?? `${stage.key}-${stage.sequence}`} className="timeline-item">
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div className="stack" style={{ gap: 4 }}>
                        <strong>{stage.label}</strong>
                        <span className="muted">{stage.amount}</span>
                      </div>
                      <span className={`chip ${stage.status === "disputed" ? "danger" : stage.released ? "success" : stage.proofHash === "pending" ? "info" : "warning"}`}>
                        {stage.status}
                      </span>
                    </div>
                    <div className="stack" style={{ gap: 6, marginTop: 10 }}>
                      <div className="muted">Proof status: {stage.status}</div>
                      <div className="muted">Auto-release: {stage.autoReleaseAt ?? "manual review"}</div>
                      <div className="muted">Proof submitted: {stage.proofSubmittedAt ?? "not yet submitted"}</div>
                    </div>
                    <div className="actions-inline" style={{ marginTop: 14 }}>
                      <button
                        className="button"
                        disabled={stage.released || stage.proofHash === "pending" || !stage.stageId}
                        onClick={() => stage.stageId && handleRelease(stage.stageId, stage.key)}
                        type="button"
                      >
                        Approve
                      </button>
                      <button
                        className="button secondary"
                        disabled={stage.proofHash === "pending" || !stage.stageId || stage.status === "disputed"}
                        onClick={() => stage.stageId && handleDispute(stage.stageId)}
                        type="button"
                      >
                        Dispute
                      </button>
                      <button
                        className="button secondary"
                        disabled={!stage.proofBundleAvailable || !stage.stageId || !buyerToken}
                        onClick={async () => stage.stageId && buyerToken && setSelectedProofBundle(await fetchProofBundle(job.id, stage.stageId, buyerToken))}
                        type="button"
                      >
                        Review proof
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {selectedProofBundle ? (
            <section className="card fade-in">
              <span className="eyebrow">Proof review</span>
              <h3 className="section-title">Decrypted buyer review</h3>
              <div className="summary-grid">
                <div className="summary-tile">
                  <span className="eyebrow">Stage</span>
                  <strong>{selectedProofBundle.stageKey}</strong>
                </div>
                <div className="summary-tile">
                  <span className="eyebrow">Created</span>
                  <strong>{selectedProofBundle.createdAt}</strong>
                </div>
                <div className="summary-tile">
                  <span className="eyebrow">Proof hash</span>
                  <strong className="mono-value">{selectedProofBundle.proofHash}</strong>
                </div>
                <div className="summary-tile">
                  <span className="eyebrow">Media</span>
                  <strong>{selectedProofBundle.media.length} item(s)</strong>
                </div>
              </div>
              <p className="muted">{selectedProofBundle.note ?? "No note provided."}</p>
              <ProofMediaGallery media={selectedProofBundle.media} title="Buyer proof review" />
            </section>
          ) : null}

          {job ? <JobTimeline job={job} /> : null}
        </div>

        <aside className="summary-column">
          <section className="card fade-in">
            <span className="eyebrow">Buyer summary</span>
            <h2 className="section-title">What matters right now</h2>
            <div className="summary-rail">
              <div className="summary-grid">
                <div className="summary-tile">
                  <span className="eyebrow">Mode</span>
                  <strong>{form.mode ?? "DIRECT_DISPATCH"}</strong>
                  <span className="muted">{form.title || "Untitled job"}</span>
                </div>
                <div className="summary-tile">
                  <span className="eyebrow">Current step</span>
                  <strong>{currentStep}. {currentStep === 1 ? "Plan" : currentStep === 2 ? "Fund" : currentStep === 3 ? "Dispatch" : "Review"}</strong>
                  <span className="muted">{statusMessage}</span>
                </div>
                <div className="summary-tile">
                  <span className="eyebrow">Needs review</span>
                  <strong>{nextBuyerAction}</strong>
                  <span className="muted">{stagesNeedingReview.length} proof-backed stages awaiting buyer action</span>
                </div>
                <div className="summary-tile">
                  <span className="eyebrow">Current stage</span>
                  <strong>{job?.currentStage ?? "Draft setup"}</strong>
                  <span className="muted">{job?.payoutSummary ?? `${form.maxSpendUsd.toFixed(2)} cUSD planned`}</span>
                </div>
              </div>
              <div className="card alt">
                <strong>Planner recommendation</strong>
                <div className="muted" style={{ marginTop: 8 }}>
                  {plannerState.loading ? "Loading private planner preview…" : plannerState.result ?? plannerState.error ?? "No planner preview yet."}
                </div>
                <div className="actions-inline" style={{ marginTop: 10 }}>
                  <span className={`chip ${plannerState.provider === "venice-live" ? "success" : plannerState.provider ? "warning" : "info"}`}>
                    {plannerProviderLabel(plannerState.provider)}
                  </span>
                </div>
                <div className="muted" style={{ marginTop: 8 }}>{plannerEffectLabel(form.plannerPreview?.action)}</div>
                {plannerState.providerReason ? <div className="muted" style={{ marginTop: 8 }}>{plannerState.providerReason}</div> : null}
              </div>
              <div className="card alt">
                <strong>Privacy boundary</strong>
                <div className="muted" style={{ marginTop: 8 }}>
                  Visible to runners: coarse area, timing window, payout schedule, verification requirement, and mode.
                </div>
                <div className="muted" style={{ marginTop: 8 }}>
                  Private until accept: exact destination, hidden notes, fallback instructions, preferences, and handoff secret.
                </div>
              </div>
              <details className="detail-disclosure">
                <summary>Advanced job details</summary>
                <div className="summary-grid" style={{ marginTop: 14 }}>
                  <div className="summary-tile">
                    <span className="eyebrow">Job id</span>
                    <strong className="mono-value">{job?.id ?? "Draft only"}</strong>
                  </div>
                  <div className="summary-tile">
                    <span className="eyebrow">Onchain id</span>
                    <strong className="mono-value">{onchainJobId ?? "Not submitted"}</strong>
                  </div>
                  <div className="summary-tile">
                    <span className="eyebrow">Timing window</span>
                    <strong>{form.timingWindow ?? "Within the next 2 hours"}</strong>
                  </div>
                  <div className="summary-tile">
                    <span className="eyebrow">Heartbeat rule</span>
                    <strong>{form.heartbeatCount ?? 3} × every {form.heartbeatIntervalSeconds ?? 300}s</strong>
                  </div>
                </div>
              </details>
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
          {job ? <ExplorerPanel links={explorerLinks} /> : null}
        </aside>
      </div>
    </main>
  );
}
