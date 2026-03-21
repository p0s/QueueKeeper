"use client";

import { useEffect, useState } from "react";
import type { BuyerJobFormInput, QueueJobView, QueueStageKey } from "@queuekeeper/shared";
import {
  createOrUpdateDemoJob,
  releaseDemoStage,
  requestPlannerPreview
} from "../lib/agent-client";
import { createLiveJob, releaseLiveStage } from "../lib/chain-client";
import { buildTxExplorerLinks } from "../lib/explorer";
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

const releaseStages: QueueStageKey[] = ["scout", "arrival", "heartbeat", "completion"];

export function BuyerDemo({ initialDraft, initialJob }: BuyerDemoProps) {
  const [form, setForm] = useState<BuyerJobFormInput>(initialDraft);
  const [job, setJob] = useState<QueueJobView | null>(initialJob);
  const [plannerState, setPlannerState] = useState<PlannerState>({
    loading: false,
    selectedRunnerAddress: initialJob?.selectedRunnerAddress ?? initialDraft.selectedRunnerAddress
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [statusMessage, setStatusMessage] = useState<string>("No funded job yet.");
  const [sendLiveTx, setSendLiveTx] = useState(false);
  const [onchainJobId, setOnchainJobId] = useState<string | null>(null);
  const [cachedTxHashes, setCachedTxHashes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!job?.id) {
      setOnchainJobId(null);
      setCachedTxHashes({});
      return;
    }

    setOnchainJobId(getCachedOnchainJobId(job.id));
    setCachedTxHashes(getCachedTxHashes(job.id));
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
      const nextJob = await createOrUpdateDemoJob({
        ...validForm,
        id: job?.id ?? validForm.id,
        plannerPreview: validForm.plannerPreview,
        selectedRunnerAddress: plannerState.selectedRunnerAddress ?? validForm.selectedRunnerAddress
      });
      setJob(nextJob);
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

  async function handleRelease(stageKey: QueueStageKey) {
    if (!job) {
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

      const nextJob = await releaseDemoStage(job.id, {
        stageKey,
        txHash
      });
      setJob(nextJob);
      setStatusMessage(`${nextJob.stages.find((stage) => stage.key === stageKey)?.label} payout released.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Stage release failed.");
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
            {releaseStages.map((stageKey) => {
              const stage = job.stages.find((entry) => entry.key === stageKey);
              if (!stage) return null;

              return (
                <div key={stage.key} className="action-row">
                  <div>
                    <strong>{stage.label}</strong>
                    <div className="muted">Proof status: {stage.status}</div>
                  </div>
                  <button
                    className="button"
                    disabled={stage.released || stage.proofHash === "pending"}
                    onClick={() => handleRelease(stage.key)}
                    type="button"
                  >
                    Release {stage.label}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {job ? <JobTimeline job={job} /> : null}
      {job ? <ExplorerPanel links={explorerLinks} /> : null}
    </main>
  );
}
