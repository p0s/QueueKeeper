"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AgentIdentityView, BuyerJobFormInput, FundingNormalizationReceiptRequest, PrincipalMode } from "@queuekeeper/shared";
import { createAndPostJob, requestPlannerPreview } from "../lib/agent-client";
import { getAgentIdentityManifest, procurementThesis } from "../lib/agent-manifest";
import { createLiveJob } from "../lib/chain-client";
import { resolveAddressOrEns, useEnsIdentity } from "../lib/ens";
import { setBuyerToken } from "../lib/job-session";
import { AgentIdentityCard } from "./agent-identity-card";
import { UniswapFundingCard } from "./uniswap-funding-card";

type PlannerState = {
  loading: boolean;
  result?: string;
  provider?: string;
  providerReason?: string;
};

type TaskStudioProps = {
  principalMode: PrincipalMode;
  initialDraft: BuyerJobFormInput;
  agentIdentity?: AgentIdentityView;
};

export function TaskStudio({
  principalMode,
  initialDraft,
  agentIdentity = getAgentIdentityManifest()
}: TaskStudioProps) {
  const router = useRouter();
  const [form, setForm] = useState<BuyerJobFormInput>({
    ...initialDraft,
    principalMode
  });
  const [plannerState, setPlannerState] = useState<PlannerState>({ loading: false });
  const [statusMessage, setStatusMessage] = useState("No task posted yet.");
  const [sendLiveTx, setSendLiveTx] = useState(false);
  const [fundingReceipt, setFundingReceipt] = useState<Omit<FundingNormalizationReceiptRequest, "buyerToken"> | null>(null);
  const runnerIdentity = useEnsIdentity(form.selectedRunnerAddress ?? null);

  function update<K extends keyof BuyerJobFormInput>(key: K, value: BuyerJobFormInput[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
      principalMode
    }));
  }

  async function handlePreview() {
    setPlannerState({ loading: true });
    try {
      const resolvedRunner = await resolveAddressOrEns(form.selectedRunnerAddress);
      const nextForm = {
        ...form,
        principalMode,
        selectedRunnerAddress: resolvedRunner.address ?? form.selectedRunnerAddress
      };
      const preview = await requestPlannerPreview(nextForm);
      setPlannerState({
        loading: false,
        result: `${preview.action} · ${preview.reason}`,
        provider: preview.provider,
        providerReason: preview.providerReason
      });
      setForm((current) => ({
        ...current,
        principalMode,
        plannerPreview: preview,
        selectedRunnerAddress: preview.selectedRunnerAddress ?? nextForm.selectedRunnerAddress ?? current.selectedRunnerAddress
      }));
    } catch (error) {
      setPlannerState({
        loading: false,
        result: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async function handlePost() {
    setStatusMessage("Posting task…");
    try {
      const resolvedRunner = await resolveAddressOrEns(form.selectedRunnerAddress);
      const nextForm = {
        ...form,
        principalMode,
        selectedRunnerAddress: resolvedRunner.address ?? form.selectedRunnerAddress
      };
      const created = await createAndPostJob(nextForm, undefined, fundingReceipt ?? undefined);
      setBuyerToken(created.job.id, created.buyerToken);
      let nextMessage = `Task ${created.job.id} posted with bounded spend.`;

      if (sendLiveTx) {
        try {
          const live = await createLiveJob(nextForm, nextForm.selectedRunnerAddress);
          nextMessage += ` Live createTask tx captured with onchain id ${live.onchainJobId}.`;
        } catch (error) {
          nextMessage += ` Live createTask fell back to the hosted state path: ${error instanceof Error ? error.message : String(error)}`;
        }
      }

      setStatusMessage(nextMessage);
      router.push(`/tasks/${created.job.id}`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Task posting failed.");
    }
  }

  return (
    <main className="container stack fade-in">
      <section className="card hero-card">
        <span className="badge-pill">{principalMode === "AGENT" ? "Agent Mode" : "Human Mode"}</span>
        <h1 className="hero-headline" style={{ maxWidth: "12ch", fontSize: "clamp(2.8rem, 5vw, 4.6rem)" }}>
          Buy information first, commitment later.
        </h1>
        <p className="hero-copy muted">{procurementThesis}</p>
        <div className="cta-row">
          <a className="button secondary" href="/tasks">Browse public tasks</a>
          <a className="button secondary" href="/evidence">Open sponsor evidence</a>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="card">
          <span className="eyebrow">Create task</span>
          <h2 className="section-title">{principalMode === "AGENT" ? "Agent-authored private procurement task" : "Human-authored private procurement task"}</h2>
          <p className="muted section-copy">
            Total budget is pre-committed, but value is purchased incrementally. The runner gets paid early and often; the principal can stop at any step.
          </p>
          <div className="form-sections" style={{ marginTop: 16 }}>
            <div className="card alt section-card">
              <strong>Public task summary</strong>
              <div className="field-grid">
                <label className="field">
                  <span>Task title</span>
                  <input className="input" value={form.title} onChange={(event) => update("title", event.target.value)} />
                </label>
                <label className="field">
                  <span>Coarse area</span>
                  <input className="input" value={form.coarseArea} onChange={(event) => update("coarseArea", event.target.value)} />
                </label>
                <label className="field">
                  <span>Task mode</span>
                  <select className="input" value={form.mode ?? "DIRECT_DISPATCH"} onChange={(event) => update("mode", event.target.value as BuyerJobFormInput["mode"])}>
                    <option value="DIRECT_DISPATCH">Direct dispatch</option>
                    <option value="VERIFIED_POOL">Verified pool</option>
                  </select>
                </label>
                {(form.mode ?? "DIRECT_DISPATCH") === "DIRECT_DISPATCH" ? (
                  <label className="field">
                    <span>Dispatch runner address or ENS</span>
                    <input className="input" value={form.selectedRunnerAddress ?? ""} onChange={(event) => update("selectedRunnerAddress", event.target.value)} />
                    <span className="muted">
                      {runnerIdentity.ensName
                        ? `Resolved ENS: ${runnerIdentity.ensName}`
                        : runnerIdentity.address
                          ? `Resolved address: ${runnerIdentity.address}`
                          : runnerIdentity.error ?? "Enter a 0x address or .eth name."}
                    </span>
                  </label>
                ) : null}
                <label className="field">
                  <span>Timing window</span>
                  <input className="input" value={form.timingWindow ?? ""} onChange={(event) => update("timingWindow", event.target.value)} />
                </label>
              </div>
            </div>

            <div className="card alt section-card">
              <strong>Private task payload</strong>
              <div className="field-grid">
                <label className="field">
                  <span>Exact destination</span>
                  <textarea className="textarea" value={form.exactLocation} onChange={(event) => update("exactLocation", event.target.value)} />
                </label>
                <label className="field">
                  <span>Private instructions</span>
                  <textarea className="textarea" value={form.hiddenNotes} onChange={(event) => update("hiddenNotes", event.target.value)} />
                </label>
                <label className="field">
                  <span>Fallback instructions</span>
                  <textarea className="textarea" value={form.privateFallbackInstructions ?? ""} onChange={(event) => update("privateFallbackInstructions", event.target.value)} />
                </label>
                <label className="field">
                  <span>Handoff secret</span>
                  <input className="input" value={form.handoffSecret ?? ""} onChange={(event) => update("handoffSecret", event.target.value)} />
                </label>
              </div>
            </div>

            <div className="card alt section-card">
              <strong>Increment pricing</strong>
              <div className="stage-row">
                <label className="field"><span>Total budget</span><input className="input" type="number" value={form.maxSpendUsd} onChange={(event) => update("maxSpendUsd", Number(event.target.value))} /></label>
                <label className="field"><span>Scout</span><input className="input" type="number" value={form.scoutFeeUsd} onChange={(event) => update("scoutFeeUsd", Number(event.target.value))} /></label>
                <label className="field"><span>Arrival</span><input className="input" type="number" value={form.arrivalFeeUsd} onChange={(event) => update("arrivalFeeUsd", Number(event.target.value))} /></label>
                <label className="field"><span>Heartbeat</span><input className="input" type="number" value={form.heartbeatFeeUsd} onChange={(event) => update("heartbeatFeeUsd", Number(event.target.value))} /></label>
                <label className="field"><span>Completion</span><input className="input" type="number" value={form.completionFeeUsd} onChange={(event) => update("completionFeeUsd", Number(event.target.value))} /></label>
                <label className="field"><span>Heartbeat count</span><input className="input" type="number" value={form.heartbeatCount ?? 3} onChange={(event) => update("heartbeatCount", Number(event.target.value))} /></label>
                <label className="field"><span>Heartbeat cadence (seconds)</span><input className="input" type="number" value={form.heartbeatIntervalSeconds ?? 300} onChange={(event) => update("heartbeatIntervalSeconds", Number(event.target.value))} /></label>
                <label className="field"><span>Expires in minutes</span><input className="input" type="number" value={form.expiresInMinutes} onChange={(event) => update("expiresInMinutes", Number(event.target.value))} /></label>
              </div>
            </div>

            <UniswapFundingCard onReceiptReady={setFundingReceipt} />

            <div className="card alt section-card">
              <strong>Posting controls</strong>
              <label className="checkbox-row">
                <input checked={sendLiveTx} onChange={(event) => setSendLiveTx(event.target.checked)} type="checkbox" />
                <span>Also try the live Celo task create path when a wallet is available.</span>
              </label>
              <div className="cta-row">
                <button className="button secondary" onClick={handlePreview} type="button">
                  {plannerState.loading ? "Previewing…" : "Preview private planner"}
                </button>
                <button className="button" onClick={handlePost} type="button">Fund and post task</button>
              </div>
              {fundingReceipt ? (
                <p className="muted" style={{ marginTop: 12 }}>
                  Latest treasury normalization receipt: {fundingReceipt.network} · {fundingReceipt.txHash}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="summary-column">
          {principalMode === "AGENT" ? <AgentIdentityCard identity={agentIdentity} /> : null}
          <section className="card">
            <span className="eyebrow">Procurement thesis</span>
            <h3 className="section-title">Bound trust to the next increment</h3>
            <p className="muted">{procurementThesis}</p>
            <div className="status-banner" style={{ marginTop: 14 }}>{statusMessage}</div>
          </section>
          <section className="card">
            <span className="eyebrow">Planner state</span>
            <h3 className="section-title">Private decision boundary</h3>
            <p className="muted">{plannerState.result ?? "No planner decision yet."}</p>
            <div className="actions-inline" style={{ marginTop: 10 }}>
              <span className={`chip ${plannerState.provider === "venice-live" ? "success" : plannerState.provider ? "warning" : "info"}`}>
                {plannerState.provider ?? "not-run"}
              </span>
            </div>
            {plannerState.providerReason ? <p className="muted" style={{ marginTop: 10 }}>{plannerState.providerReason}</p> : null}
          </section>
        </aside>
      </div>
    </main>
  );
}
