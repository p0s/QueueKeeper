import type { QueueJobView } from "@queuekeeper/shared";

export function JobTimeline({ job }: { job: QueueJobView }) {
  return (
    <div className="card">
      <h3>Proof + payout timeline</h3>
      <div className="timeline">
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
