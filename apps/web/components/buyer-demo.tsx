"use client";

import { useMemo, useState } from "react";
import type { QueueJobView } from "@queuekeeper/shared";
import { requestPlannerPreview } from "../lib/agent-client";
import { JobTimeline } from "./job-timeline";
import { PolicyCard } from "./policy-card";
import { WalletPanel } from "./wallet-panel";

export function BuyerDemo({ initialJob }: { initialJob: QueueJobView }) {
  const [job, setJob] = useState(initialJob);
  const [plannerState, setPlannerState] = useState<{ loading: boolean; result?: string; error?: string }>({ loading: false });
  const [funded, setFunded] = useState(job.status !== "draft");

  const hiddenSummary = useMemo(() => job.keptPrivate.join(", "), [job.keptPrivate]);

  async function handlePlannerPreview() {
    setPlannerState({ loading: true });
    try {
      const preview = await requestPlannerPreview(job);
      setPlannerState({
        loading: false,
        result: `${preview.action} · ${preview.reason}${preview.selectedRunnerAddress ? ` · runner ${preview.selectedRunnerAddress}` : ""}`
      });
    } catch (error) {
      setPlannerState({ loading: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  function handleFundEscrow() {
    setFunded(true);
    setJob((current) => ({
      ...current,
      status: current.status === "draft" ? "posted" : current.status,
      currentStage: "Escrow funded and ready for verified runner acceptance",
      payoutSummary: `0 released · ${current.maxSpend} reserved`
    }));
  }

  return (
    <main className="container grid">
      <section className="card">
        <h1>Create job</h1>
        <p className="muted">Buyer flow for the demo: create the errand, preview the private planner decision, bind the permission policy, and fund escrow.</p>
        <div className="grid">
          <input className="input" placeholder="Job title" defaultValue={job.title} />
          <input className="input" placeholder="Coarse area" defaultValue={job.coarseArea} />
          <textarea className="textarea" placeholder="Exact destination (hidden until acceptance)" defaultValue="Encrypted exact destination + handoff note" />
          <input className="input" placeholder="Hidden buyer max budget" defaultValue={job.maxSpend} />
          <div className="stage-row">
            {job.stages.map((stage) => (
              <input key={stage.key} className="input" defaultValue={stage.amount.split(" ")[0]} aria-label={stage.label} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="button" onClick={handlePlannerPreview} type="button">Preview planner decision</button>
            <button className="button" onClick={handleFundEscrow} type="button">Fund escrow</button>
          </div>
          <div className="card">
            <strong>Planner preview</strong>
            <div className="muted" style={{ marginTop: 8 }}>
              {plannerState.loading ? "Loading private planner preview…" : plannerState.result ?? plannerState.error ?? "No planner preview yet."}
            </div>
          </div>
          <div className="card">
            <strong>What stays private</strong>
            <div className="muted" style={{ marginTop: 8 }}>{hiddenSummary}</div>
          </div>
        </div>
      </section>
      <WalletPanel connected={true} funded={funded} />
      <PolicyCard policy={job.policy} />
      <JobTimeline job={job} />
    </main>
  );
}
