import type { QueueJobView } from "@queuekeeper/shared";
import { buildExplorerTxUrl } from "../lib/explorer";

export function JobTimeline({ job }: { job: QueueJobView }) {
  const grouped = job.stages.reduce<Record<string, typeof job.stages>>((acc, stage) => {
    const key = stage.key === "heartbeat" ? "heartbeats" : stage.key;
    acc[key] ??= [];
    acc[key].push(stage);
    return acc;
  }, {});

  function tone(status: string) {
    if (status.includes("disputed")) return "danger";
    if (status.includes("auto") || status.includes("awaiting")) return "warning";
    if (status.includes("approved") || status.includes("released") || status.includes("settled")) return "success";
    return "info";
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <span className="eyebrow">Receipts</span>
          <h3 className="section-title" style={{ marginBottom: 6 }}>Proof + payout timeline</h3>
          <div className="muted">Current stage: {job.currentStage}</div>
        </div>
        <div className="badge">{job.payoutSummary}</div>
      </div>
      <div className="timeline" style={{ marginTop: 16 }}>
        {Object.entries(grouped).map(([groupKey, stages]) => (
          <div key={groupKey} className="stack" style={{ gap: 12 }}>
            {groupKey === "heartbeats" ? <span className="eyebrow">Heartbeat progress</span> : null}
            {stages
              .slice()
              .sort((left, right) => (left.sequence ?? 0) - (right.sequence ?? 0))
              .map((stage) => (
              <div key={stage.stageId ?? `${stage.key}-${stage.sequence}`} className="timeline-item">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div className="stack" style={{ gap: 6 }}>
                    <strong>{stage.label}</strong>
                    <span className="muted">{stage.amount}</span>
                  </div>
                  <span className={`chip ${tone(stage.status)}`}>{stage.status}</span>
                </div>
                <div className="stack" style={{ gap: 6, marginTop: 10 }}>
                  <div className="muted">{stage.timestamp}</div>
                  <div className="muted">Proof hash: {stage.proofHash}</div>
                  <div className="muted">Proof submitted: {stage.proofSubmittedAt ?? "not yet submitted"}</div>
                  <div className="muted">Released at: {stage.releasedAt ?? "not yet released"}</div>
                  <div className="muted">Review window: {stage.reviewWindowEndsAt ?? "not configured"}</div>
                  <div className="muted">Auto-release: {stage.autoReleaseAt ?? "manual review"}</div>
                  {stage.disputeReason ? <div className="muted">Dispute reason: {stage.disputeReason}</div> : null}
                  {typeof stage.imageCount === "number" ? <div className="muted">Images: {stage.imageCount}</div> : null}
                </div>
                {(stage.proofTxHash || stage.releaseTxHash) ? (
                  <div className="actions-inline" style={{ marginTop: 12 }}>
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
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
