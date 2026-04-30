import type { QueueJobView } from "@queuekeeper/shared";
import { buildExplorerTxUrl } from "../lib/explorer";

function tone(status: string) {
  if (status.includes("disputed")) return "danger";
  if (status.includes("auto") || status.includes("awaiting")) return "warning";
  if (status.includes("approved") || status.includes("released") || status.includes("settled")) return "success";
  return "info";
}

export function JobTimeline({ job }: { job: QueueJobView }) {
  const grouped = job.stages.reduce<Record<string, typeof job.stages>>((acc, stage) => {
    const key = stage.key === "heartbeat" ? "heartbeats" : stage.key;
    acc[key] ??= [];
    acc[key].push(stage);
    return acc;
  }, {});

  return (
    <section className="card">
      <div className="action-row">
        <div className="stack-tight">
          <span className="eyebrow">Receipts timeline</span>
          <h3 className="section-title">Proofs, payouts, and freezes</h3>
        </div>
        <span className="badge">{job.payoutSummary}</span>
      </div>
      <p className="muted" style={{ marginBottom: 12 }}>
        This is the historical receipt layer. The command center above stays focused on the next action.
      </p>
      <div className="timeline">
        {Object.entries(grouped).map(([groupKey, stages]) => (
          <div key={groupKey} className="stack" style={{ gap: 12 }}>
            {groupKey === "heartbeats" ? <span className="eyebrow">Hold intervals</span> : null}
            {stages
              .slice()
              .sort((left, right) => (left.sequence ?? 0) - (right.sequence ?? 0))
              .map((stage) => (
                <div key={stage.stageId ?? `${stage.key}-${stage.sequence}`} className="timeline-item">
                  <div className="action-row">
                    <div className="stack-tight">
                      <strong>{stage.label}</strong>
                      <span className="muted">{stage.amount}</span>
                    </div>
                    <span className={`chip ${tone(stage.status)}`}>{stage.status}</span>
                  </div>
                  <div className="summary-grid compact-grid" style={{ marginTop: 12 }}>
                    <div className="summary-tile compact-tile">
                      <span className="eyebrow">Timestamp</span>
                      <strong>{stage.timestamp}</strong>
                    </div>
                    <div className="summary-tile compact-tile">
                      <span className="eyebrow">Proof state</span>
                      <strong>{stage.proofSubmittedAt ?? "No proof yet"}</strong>
                    </div>
                    <div className="summary-tile compact-tile">
                      <span className="eyebrow">Release</span>
                      <strong>{stage.releasedAt ?? "Not released"}</strong>
                    </div>
                    <div className="summary-tile compact-tile">
                      <span className="eyebrow">Images</span>
                      <strong>{typeof stage.imageCount === "number" ? stage.imageCount : 0}</strong>
                    </div>
                  </div>
                  {(stage.proofTxHash || stage.releaseTxHash || stage.disputeReason || stage.proofHash !== "pending") ? (
                    <details className="detail-disclosure" style={{ marginTop: 12 }}>
                      <summary>Advanced receipt detail</summary>
                      <div className="stack" style={{ gap: 8, marginTop: 12 }}>
                        <div className="muted">Proof hash: {stage.proofHash}</div>
                        <div className="muted">Review window: {stage.reviewWindowEndsAt ?? "not configured"}</div>
                        <div className="muted">Auto-release: {stage.autoReleaseAt ?? "manual review"}</div>
                        {stage.disputeReason ? <div className="muted">Dispute reason: {stage.disputeReason}</div> : null}
                        {(stage.proofTxHash || stage.releaseTxHash) ? (
                          <div className="actions-inline">
                            {stage.proofTxHash ? (
                              <a className="button secondary" href={buildExplorerTxUrl(stage.proofTxHash)} rel="noreferrer" target="_blank">
                                Proof tx
                              </a>
                            ) : null}
                            {stage.releaseTxHash ? (
                              <a className="button secondary" href={buildExplorerTxUrl(stage.releaseTxHash)} rel="noreferrer" target="_blank">
                                Release tx
                              </a>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </details>
                  ) : null}
                </div>
              ))}
          </div>
        ))}
      </div>
    </section>
  );
}
