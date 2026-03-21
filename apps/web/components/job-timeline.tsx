import type { QueueJobView } from "@queuekeeper/shared";
import { buildExplorerTxUrl } from "../lib/explorer";

export function JobTimeline({ job }: { job: QueueJobView }) {
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ marginBottom: 6 }}>Proof + payout timeline</h3>
          <div className="muted">Current stage: {job.currentStage}</div>
        </div>
        <div className="badge">{job.payoutSummary}</div>
      </div>
      <div className="timeline" style={{ marginTop: 16 }}>
        {job.stages.map((stage) => (
          <div key={stage.key} className="timeline-item">
            <strong>{stage.label}</strong> · {stage.amount}
            <div className="muted">Proof hash: {stage.proofHash}</div>
            <div className="muted">Status: {stage.status} · {stage.timestamp}</div>
            <div className="muted">Proof submitted: {stage.proofSubmittedAt ?? "not yet submitted"}</div>
            <div className="muted">Released at: {stage.releasedAt ?? "not yet released"}</div>
            {stage.proofTxHash ? (
              <a href={buildExplorerTxUrl(stage.proofTxHash)} rel="noreferrer" target="_blank">
                Proof tx
              </a>
            ) : null}
            {stage.releaseTxHash ? (
              <a href={buildExplorerTxUrl(stage.releaseTxHash)} rel="noreferrer" target="_blank" style={{ marginLeft: 12 }}>
                Release tx
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
