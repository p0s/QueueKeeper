"use client";

import { useEffect, useMemo, useState } from "react";
import type { AgentDecisionLogView, AgentIdentityView, QueueJobView, QueueStageKey, QueueStageView } from "@queuekeeper/shared";
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
import { getAgentIdentityManifest } from "../lib/agent-manifest";
import { getBuyerToken } from "../lib/job-session";
import { AgentIdentityCard } from "./agent-identity-card";
import { AgentLogPanel } from "./agent-log-panel";
import { ExplorerPanel } from "./explorer-panel";
import { JobTimeline } from "./job-timeline";
import { PolicyCard } from "./policy-card";
import { ProofMediaGallery } from "./proof-media-gallery";
import { UniswapFundingCard } from "./uniswap-funding-card";
import { X402HintCard } from "./x402-hint-card";

function sponsorTone(status: string) {
  if (status === "disputed") return "danger";
  if (status === "approved" || status === "auto-released" || status === "settled") return "success";
  if (status === "submitted" || status === "awaiting-release") return "warning";
  return "info";
}

function proofRequirement(stage: QueueStageView) {
  if (stage.key === "scout") return "Quick proof of line quality and opportunity signal.";
  if (stage.key === "arrival") return "Proof that the runner reached the queue or venue.";
  if (stage.key === "heartbeat") return "Heartbeat confirmation that the hold is still valid.";
  return "Final proof that the handoff or completion condition was met.";
}

function groupedStageCards(stages: QueueJobView["stages"]) {
  const heartbeats = stages.filter((stage) => stage.key === "heartbeat");
  const others = stages.filter((stage) => stage.key !== "heartbeat");
  return { heartbeats, others };
}

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
      // keep public view
    });
    fetchAgentLog(taskId, token).then((response) => {
      setAgentIdentity(response.identity);
      setAgentLog(response.log);
    }).catch(() => {
      // Agent flow stays optional in Human Mode
    });
    fetchEvidence().then((response) => setAgentIdentity(response.identity)).catch(() => {
      // keep fallback manifest
    });
  }, [taskId]);

  const reviewStage = task.stages.find((stage) => stage.status === "submitted" || stage.status === "awaiting-release");
  const nextPendingStage = task.stages.find((stage) => stage.status === "pending-proof");
  const { others, heartbeats } = useMemo(() => groupedStageCards(task.stages), [task.stages]);
  const revealStatus = task.exactLocationVisibleToViewer ? "Reveal unlocked" : "Reveal locked";

  async function refreshAgentRail() {
    if (!buyerToken) return;
    const response = await fetchAgentLog(taskId, buyerToken);
    setAgentIdentity(response.identity);
    setAgentLog(response.log);
  }

  async function handleApprove(stageId: string, stageKey: QueueStageKey) {
    if (!buyerToken) return;
    setStatusMessage(`Releasing ${stageKey} payout…`);
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

  const nextAction = reviewStage
    ? {
        title: `Release ${reviewStage.label}`,
        body: "A proof-backed increment is waiting for release. Review if needed, then send the next payout.",
        action: reviewStage.stageId ? () => handleApprove(reviewStage.stageId as string, reviewStage.key) : undefined,
        label: "Release payout",
        sponsor: "Celo micropayment rail"
      }
    : task.principalMode === "AGENT" && buyerToken
      ? {
          title: "Let the agent decide",
          body: "The agent can continue scouting, escalate into hold mode, or stop after the current verified increment.",
          action: handleAgentDecision,
          label: "Let agent decide",
          sponsor: "Venice private planner"
        }
      : !task.acceptedRunnerAddress
        ? {
            title: "Wait for verified acceptance",
            body: "The runner must pass the Self gate before exact destination data unlocks.",
            action: undefined,
            label: "Open runner flow",
            sponsor: "Self acceptance gate"
          }
        : {
            title: nextPendingStage ? `Wait for ${nextPendingStage.label}` : "Task is waiting",
            body: nextPendingStage
              ? "The next payout will only move after the runner submits the next proof-backed increment."
              : "No buyer action is required right now.",
            action: undefined,
            label: "Open runner flow",
            sponsor: "Proof-backed state"
          };

  return (
    <main className="container stack fade-in">
      <section className="card hero-card command-hero">
        <div className="action-row">
          <div className="stack-tight">
            <span className="badge-pill">{task.principalMode === "AGENT" ? "Agent Mode" : "Human Mode"}</span>
            <h1 className="hero-headline hero-headline-tight">{task.title}</h1>
            <p className="hero-copy muted">
              Private scout-and-hold task with proof-backed releases, explicit stop rights, and one live operational rail per step.
            </p>
          </div>
          <div className="trust-ladder">
            <span className={`chip ${task.currentStage.toLowerCase().includes("scout") ? "success" : "info"}`}>Scout</span>
            <span className={`chip ${task.currentStage.toLowerCase().includes("hold") || task.currentStage.toLowerCase().includes("heartbeat") ? "success" : "info"}`}>Hold</span>
            <span className={`chip ${task.status === "completed" ? "success" : "info"}`}>Complete</span>
          </div>
        </div>
        <div className="status-ribbon">
          <div className="summary-tile">
            <span className="eyebrow">Current stage</span>
            <strong>{task.currentStage}</strong>
          </div>
          <div className="summary-tile">
            <span className="eyebrow">Released so far</span>
            <strong>{task.payoutSummary}</strong>
          </div>
          <div className="summary-tile">
            <span className="eyebrow">Stop right</span>
            <strong>Principal or runner can stop after the current step</strong>
          </div>
          <div className="summary-tile">
            <span className="eyebrow">Reveal status</span>
            <strong>{revealStatus}</strong>
          </div>
        </div>
      </section>

      <div className="dashboard-grid">
        <div className="stack">
          <section className="card dominant-card">
            <div className="action-row">
              <div className="stack-tight">
                <span className="eyebrow">Next action</span>
                <h2 className="section-title">{nextAction.title}</h2>
              </div>
              <span className="chip info">{nextAction.sponsor}</span>
            </div>
            <p className="muted">{nextAction.body}</p>
            <div className="cta-row" style={{ marginTop: 12 }}>
              {nextAction.action ? (
                <button className="button" onClick={nextAction.action} type="button">{nextAction.label}</button>
              ) : (
                <a className="button" href={`/runner/${task.id}`}>{nextAction.label}</a>
              )}
              {buyerToken ? <button className="button secondary" onClick={handleStop} type="button">Stop after current step</button> : null}
            </div>
            <div className="status-banner" style={{ marginTop: 14 }}>{statusMessage}</div>
          </section>

          <section className="card">
            <div className="action-row">
              <div className="stack-tight">
                <span className="eyebrow">Stage ladder</span>
                <h2 className="section-title">Proof-backed path</h2>
              </div>
              <span className="chip success">Pay per verified step</span>
            </div>
            <div className="stage-ladder">
              {others.map((stage) => (
                <div key={stage.stageId ?? `${stage.key}-${stage.sequence}`} className="stage-step-card">
                  <div className="action-row">
                    <div className="stack-tight">
                      <span className="eyebrow">{stage.label}</span>
                      <strong>{stage.amount}</strong>
                    </div>
                    <span className={`chip ${sponsorTone(stage.status)}`}>{stage.status}</span>
                  </div>
                  <p className="muted">{proofRequirement(stage)}</p>
                  <div className="summary-grid">
                    <div className="summary-tile">
                      <span className="eyebrow">Proof</span>
                      <strong>{stage.proofHash === "pending" ? "Awaiting proof" : "Proof submitted"}</strong>
                    </div>
                    <div className="summary-tile">
                      <span className="eyebrow">Auto-release</span>
                      <strong>{stage.autoReleaseAt ?? "Manual release only"}</strong>
                    </div>
                  </div>
                  <div className="actions-inline" style={{ marginTop: 12 }}>
                    {buyerToken && stage.stageId ? (
                      <button className="button secondary" disabled={!stage.proofBundleAvailable} onClick={async () => setSelectedProofBundle(await fetchProofBundle(taskId, stage.stageId as string, buyerToken))} type="button">Review proof</button>
                    ) : null}
                    {buyerToken && stage.stageId ? (
                      <button className="button" disabled={stage.proofHash === "pending" || stage.released} onClick={() => handleApprove(stage.stageId as string, stage.key)} type="button">Release</button>
                    ) : null}
                  </div>
                  {buyerToken && stage.stageId ? (
                    <details className="detail-disclosure" style={{ marginTop: 12 }}>
                      <summary>Advanced actions</summary>
                      <div className="cta-row" style={{ marginTop: 12 }}>
                        <button className="button secondary" disabled={stage.proofHash === "pending" || stage.status === "disputed"} onClick={() => handleDispute(stage.stageId as string)} type="button">Dispute increment</button>
                      </div>
                    </details>
                  ) : null}
                </div>
              ))}

              {heartbeats.length > 0 ? (
                <div className="stage-step-card">
                  <div className="action-row">
                    <div className="stack-tight">
                      <span className="eyebrow">Hold interval</span>
                      <strong>{heartbeats.length} heartbeat steps</strong>
                    </div>
                    <span className="chip warning">Repeated micro-releases</span>
                  </div>
                  <div className="heartbeat-stack">
                    {heartbeats.map((stage) => (
                      <div key={stage.stageId ?? `${stage.key}-${stage.sequence}`} className="heartbeat-item">
                        <div className="action-row">
                          <div className="stack-tight">
                            <strong>{stage.label}</strong>
                            <span className="muted">{stage.amount}</span>
                          </div>
                          <span className={`chip ${sponsorTone(stage.status)}`}>{stage.status}</span>
                        </div>
                        <span className="muted">{stage.autoReleaseAt ?? "Manual release only"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
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
          {task.principalMode === "AGENT" ? <AgentIdentityCard compact identity={agentIdentity} /> : null}

          <section className="card rail-card">
            <div className="action-row">
              <div className="stack-tight">
                <span className="eyebrow">Private boundary</span>
                <h3 className="section-title">What is visible now</h3>
              </div>
              <span className="chip info">Self acceptance gate</span>
            </div>
            <div className="summary-grid">
              <div className="summary-tile">
                <span className="eyebrow">Public summary</span>
                <strong>{task.coarseArea}</strong>
                <span className="muted">{task.timingWindow}</span>
              </div>
              <div className="summary-tile">
                <span className="eyebrow">Private until accept</span>
                <strong>{task.exactLocationVisibleToViewer ?? task.exactLocationHint}</strong>
                <span className="muted">Reveal remains gated until the verified runner clears acceptance.</span>
              </div>
            </div>
            <details className="detail-disclosure" style={{ marginTop: 12 }}>
              <summary>Show private fields protected by the boundary</summary>
              <ul className="muted" style={{ marginTop: 12, paddingLeft: 18 }}>
                {task.keptPrivate.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </details>
          </section>

          <section className="card rail-card">
            <div className="action-row">
              <div className="stack-tight">
                <span className="eyebrow">Agent decision</span>
                <h3 className="section-title">Private decision boundary</h3>
              </div>
              <span className={`chip ${task.plannerProvider === "venice-live" ? "success" : task.plannerProvider ? "warning" : "info"}`}>
                {task.plannerProvider ?? "not-run"}
              </span>
            </div>
            <p className="muted">{task.agentDecisionSummary ?? task.plannerPreview?.reason ?? "No decision recorded yet."}</p>
            {task.principalMode === "AGENT" && buyerToken ? (
              <div className="cta-row" style={{ marginTop: 12 }}>
                <button className="button" onClick={handleAgentDecision} type="button">Let agent decide</button>
              </div>
            ) : null}
          </section>

          <PolicyCard policy={task.policy} />

          <section className="card rail-card">
            <span className="eyebrow">Live sponsor tools</span>
            <h3 className="section-title">Optional sidecars</h3>
            <p className="muted">These rails are real, but they stay secondary to the core scout-and-hold loop.</p>
            <details className="detail-disclosure" style={{ marginTop: 12 }}>
              <summary>Uniswap budget normalization</summary>
              {buyerToken ? (
                <div style={{ marginTop: 14 }}>
                  <UniswapFundingCard
                    onReceiptReady={async (receipt) => {
                      const response = await recordFundingNormalization(taskId, buyerToken, receipt);
                      setTask(response.job);
                      setStatusMessage("Funding normalization receipt recorded against this task.");
                    }}
                  />
                </div>
              ) : (
                <p className="muted" style={{ marginTop: 12 }}>Available after the buyer token is loaded.</p>
              )}
            </details>
            {task.principalMode === "AGENT" && buyerToken ? (
              <details className="detail-disclosure" style={{ marginTop: 12 }}>
                <summary>Base x402 paid venue hint</summary>
                <div style={{ marginTop: 14 }}>
                  <X402HintCard
                    buyerToken={buyerToken}
                    onTaskUpdated={async (nextTask) => {
                      setTask(nextTask);
                      setStatusMessage("Paid venue hint added. The next planner decision now sees the private hint.");
                      await refreshAgentRail();
                    }}
                    taskId={taskId}
                  />
                </div>
              </details>
            ) : null}
          </section>

          <details className="detail-disclosure">
            <summary>Advanced receipts and protocol detail</summary>
            <div className="stack" style={{ marginTop: 14 }}>
              {agentLog.length > 0 ? <AgentLogPanel log={agentLog} /> : null}
              <ExplorerPanel links={task.explorerLinks} />
            </div>
          </details>
        </aside>
      </div>
    </main>
  );
}
