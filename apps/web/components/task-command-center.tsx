"use client";

import { useEffect, useState } from "react";
import type { AgentDecisionLogView, AgentIdentityView, QueueJobView, QueueStageKey } from "@queuekeeper/shared";
import {
  approveDemoStage,
  disputeDemoStage,
  fetchAgentLog,
  fetchDemoJob,
  fetchEvidence,
  fetchProofBundle,
  recordFundingNormalization,
  requestAgentDecision,
  stopTask
} from "../lib/agent-client";
import { getAgentIdentityManifest, procurementThesis } from "../lib/agent-manifest";
import { getBuyerToken } from "../lib/job-session";
import { AgentIdentityCard } from "./agent-identity-card";
import { AgentLogPanel } from "./agent-log-panel";
import { ExplorerPanel } from "./explorer-panel";
import { JobTimeline } from "./job-timeline";
import { PolicyCard } from "./policy-card";
import { ProofMediaGallery } from "./proof-media-gallery";
import { UniswapFundingCard } from "./uniswap-funding-card";
import { X402HintCard } from "./x402-hint-card";

export function TaskCommandCenter({
  initialTask,
  taskId
}: {
  initialTask: QueueJobView;
  taskId: string;
}) {
  const [task, setTask] = useState(initialTask);
  const [buyerToken, setBuyerToken] = useState<string | null>(null);
  const [agentIdentity, setAgentIdentity] = useState<AgentIdentityView>(getAgentIdentityManifest());
  const [agentLog, setAgentLog] = useState<AgentDecisionLogView[]>([]);
  const [statusMessage, setStatusMessage] = useState("Public task view loaded.");
  const [selectedProofBundle, setSelectedProofBundle] = useState<Awaited<ReturnType<typeof fetchProofBundle>> | null>(null);

  useEffect(() => {
    const token = getBuyerToken(taskId);
    if (!token) {
      return;
    }

    setBuyerToken(token);
    fetchDemoJob(taskId, "buyer", token).then(setTask).catch(() => {
      // fall back to the public view if buyer state is unavailable
    });
    fetchAgentLog(taskId, token).then((response) => {
      setAgentIdentity(response.identity);
      setAgentLog(response.log);
    }).catch(() => {
      // evidence path remains optional in Human Mode
    });
    fetchEvidence().then((response) => setAgentIdentity(response.identity)).catch(() => {
      // keep the static manifest fallback
    });
  }, [taskId]);

  const stagesNeedingReview = task.stages.filter((stage) => stage.status === "submitted" || stage.status === "awaiting-release" || stage.status === "disputed");

  async function handleApprove(stageId: string, stageKey: QueueStageKey) {
    if (!buyerToken) return;
    setStatusMessage(`Approving ${stageKey} increment…`);
    const nextTask = await approveDemoStage(taskId, { buyerToken, stageId });
    setTask(nextTask);
    setStatusMessage(`${stageKey} increment released.`);
  }

  async function handleDispute(stageId: string) {
    if (!buyerToken) return;
    const nextTask = await disputeDemoStage(taskId, buyerToken, stageId, "Principal disputed this increment from the command center.");
    setTask(nextTask);
    setStatusMessage("Increment moved into dispute.");
  }

  async function handleStop() {
    if (!buyerToken) return;
    const nextTask = await stopTask(taskId, buyerToken, "Principal stopped after the current verified increment.");
    setTask(nextTask);
    setStatusMessage("Task stopped and unreleased increments were closed.");
  }

  async function handleAgentDecision() {
    if (!buyerToken) return;
    const response = await requestAgentDecision(taskId, buyerToken);
    setTask(response.task);
    setAgentLog(response.log);
    setStatusMessage(`${response.decision.action} · ${response.decision.reason}`);
  }

  return (
    <main className="container stack fade-in">
      <section className="card hero-card">
        <span className="badge-pill">{task.principalMode === "AGENT" ? "Agent Mode" : "Human Mode"}</span>
        <h1 className="hero-headline" style={{ maxWidth: "12ch", fontSize: "clamp(2.6rem, 4vw, 4.4rem)" }}>
          Task command center
        </h1>
        <p className="hero-copy muted">{procurementThesis}</p>
        <div className="summary-grid" style={{ marginTop: 18 }}>
          <div className="summary-tile"><span className="eyebrow">Task</span><strong>{task.title}</strong></div>
          <div className="summary-tile"><span className="eyebrow">Current stage</span><strong>{task.currentStage}</strong></div>
          <div className="summary-tile"><span className="eyebrow">Payout state</span><strong>{task.payoutSummary}</strong></div>
          <div className="summary-tile"><span className="eyebrow">Next action</span><strong>{stagesNeedingReview[0]?.label ?? "Wait for next verified increment"}</strong></div>
        </div>
      </section>

      <div className="dashboard-grid">
        <div className="stack">
          <section className="card">
            <span className="eyebrow">Public vs private</span>
            <h2 className="section-title">Task brief and reveal boundary</h2>
            <div className="summary-grid">
              <div className="summary-tile">
                <span className="eyebrow">Public summary</span>
                <strong>{task.coarseArea}</strong>
                <span className="muted">{task.timingWindow}</span>
              </div>
              <div className="summary-tile">
                <span className="eyebrow">Private until accept</span>
                <strong>{task.exactLocationVisibleToViewer ?? task.exactLocationHint}</strong>
                <span className="muted">{task.keptPrivate.join(", ")}</span>
              </div>
            </div>
          </section>

          <section className="card">
            <span className="eyebrow">Current increments</span>
            <h2 className="section-title">Scout → Hold → Complete</h2>
            <div className="grid">
              {task.stages.map((stage) => (
                <div key={stage.stageId ?? `${stage.key}-${stage.sequence}`} className="timeline-item">
                  {(() => {
                    const stageId = stage.stageId;
                    return (
                      <>
                  <div className="action-row">
                    <div className="stack-tight">
                      <strong>{stage.label}</strong>
                      <span className="muted">{stage.amount}</span>
                    </div>
                    <span className={`chip ${stage.status === "disputed" ? "danger" : stage.released ? "success" : stage.proofHash === "pending" ? "info" : "warning"}`}>
                      {stage.status}
                    </span>
                  </div>
                  <div className="muted" style={{ marginTop: 12 }}>
                    {stage.autoReleaseAt ? `Auto-release: ${stage.autoReleaseAt}` : "Manual release only"}
                  </div>
                  {buyerToken && stage.stageId ? (
                    <div className="actions-inline" style={{ marginTop: 12 }}>
                      <button className="button" disabled={stage.proofHash === "pending" || stage.released} onClick={() => stageId && handleApprove(stageId, stage.key)} type="button">Release</button>
                      <button className="button secondary" disabled={stage.proofHash === "pending" || stage.status === "disputed"} onClick={() => stageId && handleDispute(stageId)} type="button">Dispute</button>
                      <button className="button secondary" disabled={!stage.proofBundleAvailable} onClick={async () => stageId && setSelectedProofBundle(await fetchProofBundle(taskId, stageId, buyerToken))} type="button">Review proof</button>
                    </div>
                  ) : null}
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          </section>

          {selectedProofBundle ? (
            <section className="card">
              <span className="eyebrow">Proof review</span>
              <h3 className="section-title">Current encrypted bundle</h3>
              <p className="muted">{selectedProofBundle.note ?? "No note attached."}</p>
              <ProofMediaGallery media={selectedProofBundle.media} title="Task proof review" />
            </section>
          ) : null}

          <JobTimeline job={task} />
        </div>

        <aside className="summary-column">
          {task.principalMode === "AGENT" ? <AgentIdentityCard identity={agentIdentity} /> : null}
          <section className="card">
            <span className="eyebrow">Control plane</span>
            <h3 className="section-title">Principal controls</h3>
            <div className="status-banner">{statusMessage}</div>
            <div className="cta-row" style={{ marginTop: 14 }}>
              {task.principalMode === "AGENT" && buyerToken ? (
                <button className="button" onClick={handleAgentDecision} type="button">Let the agent decide</button>
              ) : null}
              {buyerToken ? <button className="button secondary" onClick={handleStop} type="button">Stop after current increment</button> : null}
              <a className="button secondary" href={`/runner/${task.id}`}>Open runner flow</a>
            </div>
          </section>
          {task.principalMode === "AGENT" && buyerToken ? (
            <X402HintCard
              buyerToken={buyerToken}
              onTaskUpdated={async (nextTask) => {
                setTask(nextTask);
                setStatusMessage("Paid venue hint added. The next planner decision now sees the private hint.");
                const response = await fetchAgentLog(taskId, buyerToken);
                setAgentIdentity(response.identity);
                setAgentLog(response.log);
              }}
              taskId={taskId}
            />
          ) : null}
          {buyerToken ? (
            <UniswapFundingCard
              onReceiptReady={async (receipt) => {
                const response = await recordFundingNormalization(taskId, buyerToken, receipt);
                setTask(response.job);
                setStatusMessage("Funding normalization receipt recorded against this task.");
              }}
            />
          ) : null}
          {agentLog.length > 0 ? <AgentLogPanel log={agentLog} /> : null}
          <PolicyCard policy={task.policy} />
          <ExplorerPanel links={task.explorerLinks} />
        </aside>
      </div>
    </main>
  );
}
