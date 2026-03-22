"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AgentIdentityView, BuyerJobFormInput, FundingNormalizationReceiptRequest, PrincipalMode } from "@queuekeeper/shared";
import { createAndPostJob, requestPlannerPreview } from "../lib/agent-client";
import { getAgentIdentityManifest } from "../lib/agent-manifest";
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
  action?: string;
};

type TaskStudioProps = {
  principalMode: PrincipalMode;
  initialDraft: BuyerJobFormInput;
  agentIdentity?: AgentIdentityView;
};

function plannerPathLabel(action?: string) {
  switch (action) {
    case "scout-only":
      return "Stage path: Scout only";
    case "hold-now":
      return "Stage path: Hold now → heartbeat intervals → complete";
    case "scout-then-hold":
      return "Stage path: Scout → hold → complete";
    case "abort":
      return "Stage path: Abort before posting";
    default:
      return "Stage path will appear after the private planner runs.";
  }
}

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
        result: preview.reason,
        provider: preview.provider,
        providerReason: preview.providerReason,
        action: preview.action
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
      <section className="card hero-card studio-hero">
        <span className="badge-pill">{principalMode === "AGENT" ? "Agent Mode" : "Human Mode"}</span>
        <div className="stack" style={{ gap: 12 }}>
          <h1 className="hero-headline hero-headline-tight">
            {principalMode === "AGENT"
              ? "Create a private task your agent can run inside a hard spend boundary."
              : "Create a private task that only pays for proof-backed progress."}
          </h1>
          <p className="hero-copy muted">
            Pre-fund the task, keep sensitive details private until acceptance, and pay only for each verified step.
          </p>
          <p className="hero-tertiary">Bound trust to the next verified increment.</p>
        </div>
        <div className="cta-row">
          <a className="button secondary" href="/tasks">Browse public tasks</a>
          <a className="button secondary" href="/evidence">See live evidence</a>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="card">
          <div className="action-row">
            <div className="stack-tight">
              <span className="eyebrow">Create task</span>
              <h2 className="section-title">{principalMode === "AGENT" ? "Agent-authored private procurement task" : "Human-authored private procurement task"}</h2>
            </div>
            <span className="chip info">{principalMode === "AGENT" ? "Agent is first-class" : "Direct principal control"}</span>
          </div>
          <p className="muted section-copy">
            Total budget is pre-committed, but value is purchased incrementally. The runner gets paid early and often; the principal can stop at any step.
          </p>

          <div className="boundary-grid" style={{ marginTop: 16 }}>
            <div className="boundary-card">
              <span className="eyebrow">What runners can see</span>
              <strong>{form.title}</strong>
              <span className="muted">{form.coarseArea} · {form.timingWindow ?? "Flexible timing"}</span>
            </div>
            <div className="boundary-card private">
              <span className="eyebrow">What stays private until accept</span>
              <strong>{form.exactLocation ? "Exact destination, notes, fallback, handoff" : "Private task payload"}</strong>
              <span className="muted">The acceptance gate protects secrets until the right verified runner is in place.</span>
            </div>
          </div>

          <div className="form-sections" style={{ marginTop: 20 }}>
            <section className="card alt section-card">
              <div className="action-row">
                <strong>Public brief</strong>
                <span className="chip info">Visible to runners</span>
              </div>
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
                    <span>Dispatch target</span>
                    <input className="input" value={form.selectedRunnerAddress ?? ""} onChange={(event) => update("selectedRunnerAddress", event.target.value)} />
                    <span className="muted">
                      {runnerIdentity.ensName
                        ? `Resolved ENS: ${runnerIdentity.ensName}`
                        : runnerIdentity.address
                          ? `Resolved address: ${runnerIdentity.address}`
                          : runnerIdentity.error ?? "Enter a valid EVM address or .eth name."}
                    </span>
                  </label>
                ) : null}
                <label className="field">
                  <span>Timing window</span>
                  <input className="input" value={form.timingWindow ?? ""} onChange={(event) => update("timingWindow", event.target.value)} />
                </label>
              </div>
            </section>

            <details className="detail-disclosure">
              <summary>Private instructions</summary>
              <div className="field-grid" style={{ marginTop: 14 }}>
                <label className="field">
                  <span>What stays private until accept</span>
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
            </details>

            <section className="card alt section-card">
              <div className="action-row">
                <strong>Payout ladder</strong>
                <span className="chip success">Pay per verified step</span>
              </div>
              <div className="stage-row">
                <label className="field"><span>Total budget</span><input className="input" type="number" value={form.maxSpendUsd} onChange={(event) => update("maxSpendUsd", Number(event.target.value))} /></label>
                <label className="field"><span>Scout</span><input className="input" type="number" value={form.scoutFeeUsd} onChange={(event) => update("scoutFeeUsd", Number(event.target.value))} /></label>
                <label className="field"><span>Arrival</span><input className="input" type="number" value={form.arrivalFeeUsd} onChange={(event) => update("arrivalFeeUsd", Number(event.target.value))} /></label>
                <label className="field"><span>Heartbeat</span><input className="input" type="number" value={form.heartbeatFeeUsd} onChange={(event) => update("heartbeatFeeUsd", Number(event.target.value))} /></label>
                <label className="field"><span>Completion</span><input className="input" type="number" value={form.completionFeeUsd} onChange={(event) => update("completionFeeUsd", Number(event.target.value))} /></label>
                <label className="field"><span>Hold intervals</span><input className="input" type="number" value={form.heartbeatCount ?? 3} onChange={(event) => update("heartbeatCount", Number(event.target.value))} /></label>
                <label className="field"><span>Heartbeat cadence (seconds)</span><input className="input" type="number" value={form.heartbeatIntervalSeconds ?? 300} onChange={(event) => update("heartbeatIntervalSeconds", Number(event.target.value))} /></label>
                <label className="field"><span>Expires in minutes</span><input className="input" type="number" value={form.expiresInMinutes} onChange={(event) => update("expiresInMinutes", Number(event.target.value))} /></label>
              </div>
            </section>

            <details className="detail-disclosure">
              <summary>Optional funding tools</summary>
              <div className="stack" style={{ gap: 14, marginTop: 14 }}>
                <div className="sponsor-inline">
                  <span className="chip info">Uniswap budget normalization</span>
                  <span className="muted">Optional stablecoin normalization before posting.</span>
                </div>
                <UniswapFundingCard onReceiptReady={setFundingReceipt} />
              </div>
            </details>

            <section className="card alt section-card">
              <div className="action-row">
                <strong>Post task</strong>
                <span className="chip success">Celo micropayment rail</span>
              </div>
              <p className="muted">
                Post the task once the brief, private payload, and payout ladder are ready. Optional live-chain creation stays secondary.
              </p>
              <details className="detail-disclosure">
                <summary>Advanced posting controls</summary>
                <label className="checkbox-row" style={{ marginTop: 12 }}>
                  <input checked={sendLiveTx} onChange={(event) => setSendLiveTx(event.target.checked)} type="checkbox" />
                  <span>Also try the live Celo task create path when a wallet is available.</span>
                </label>
              </details>
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
            </section>
          </div>
        </section>

        <aside className="summary-column">
          {principalMode === "AGENT" ? <AgentIdentityCard compact identity={agentIdentity} /> : null}

          <section className="card rail-card">
            <div className="action-row">
              <div className="stack-tight">
                <span className="eyebrow">Venice private planner</span>
                <h3 className="section-title">Planner recommendation</h3>
              </div>
              <span className={`chip ${plannerState.provider === "venice-live" ? "success" : plannerState.provider ? "warning" : "info"}`}>
                {plannerState.provider ?? "not-run"}
              </span>
            </div>
            <p className="muted">{plannerState.result ?? "The private planner has not run yet."}</p>
            <div className="status-banner" style={{ marginTop: 12 }}>{plannerPathLabel(plannerState.action)}</div>
            {plannerState.providerReason ? (
              <details className="detail-disclosure" style={{ marginTop: 12 }}>
                <summary>Show provider detail</summary>
                <p className="muted" style={{ marginTop: 12 }}>{plannerState.providerReason}</p>
              </details>
            ) : null}
          </section>

          <section className="card rail-card">
            <div className="action-row">
              <div className="stack-tight">
                <span className="eyebrow">MetaMask spend boundary</span>
                <h3 className="section-title">What the principal is authorizing</h3>
              </div>
              <span className="chip warning">Delegation ready</span>
            </div>
            <div className="summary-grid">
              <div className="summary-tile">
                <span className="eyebrow">Cap</span>
                <strong>{form.maxSpendUsd} cUSD</strong>
              </div>
              <div className="summary-tile">
                <span className="eyebrow">Task scope</span>
                <strong>{form.mode === "VERIFIED_POOL" ? "Verified runner pool" : "Single dispatch target"}</strong>
              </div>
            </div>
            <details className="detail-disclosure" style={{ marginTop: 12 }}>
              <summary>Advanced spend boundary</summary>
              <ul className="muted" style={{ marginTop: 12, paddingLeft: 18 }}>
                <li>Token, contract, expiry, and task binding remain explicit.</li>
                <li>The task can still run in fallback mode when wallet permission capture is unavailable.</li>
                <li>The buyer can still stop after any verified increment.</li>
              </ul>
            </details>
          </section>

          <section className="card rail-card">
            <div className="action-row">
              <div className="stack-tight">
                <span className="eyebrow">Public vs private</span>
                <h3 className="section-title">Reveal boundary</h3>
              </div>
              <span className="chip info">Self gate unlocks reveal</span>
            </div>
            <div className="summary-grid">
              <div className="summary-tile">
                <span className="eyebrow">Visible now</span>
                <strong>{form.coarseArea}</strong>
              </div>
              <div className="summary-tile">
                <span className="eyebrow">Hidden now</span>
                <strong>Exact destination and handoff instructions</strong>
              </div>
            </div>
            <p className="muted" style={{ marginTop: 12 }}>
              Reveal only happens after verified acceptance and access checks.
            </p>
          </section>

          <section className="card rail-card">
            <span className="eyebrow">Posting state</span>
            <h3 className="section-title">Current status</h3>
            <div className="status-banner">{statusMessage}</div>
          </section>
        </aside>
      </div>
    </main>
  );
}
