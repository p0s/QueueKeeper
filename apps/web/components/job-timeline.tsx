import type { QueueJobView } from "@queuekeeper/shared";

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
            <div className="muted">Status: {stage.released ? "released" : "awaiting release"} · {stage.timestamp}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
