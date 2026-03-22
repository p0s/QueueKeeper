import type { QueueJobView } from "@queuekeeper/shared";

export function TaskFeedBoard({ tasks }: { tasks: QueueJobView[] }) {
  return (
    <div className="job-list-grid fade-in">
      {tasks.map((task) => (
        <section key={task.id} className="card">
          <div className="action-row">
            <div className="stack-tight">
              <span className="eyebrow">{task.mode ?? "DIRECT_DISPATCH"}</span>
              <strong>{task.title}</strong>
              <span className="muted">{task.coarseArea}</span>
            </div>
            <span className="chip info">{task.status}</span>
          </div>
          <div className="summary-grid" style={{ marginTop: 14 }}>
            <div className="summary-tile">
              <span className="eyebrow">Trust model</span>
              <strong>Next verified increment</strong>
            </div>
            <div className="summary-tile">
              <span className="eyebrow">Current stage</span>
              <strong>{task.currentStage}</strong>
            </div>
            <div className="summary-tile">
              <span className="eyebrow">Payout rail</span>
              <strong>{task.payoutSummary}</strong>
            </div>
            <div className="summary-tile">
              <span className="eyebrow">Private until accept</span>
              <strong>{task.exactLocationHint}</strong>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <a className="button" href={`/tasks/${task.id}`}>Open task</a>
          </div>
        </section>
      ))}
    </div>
  );
}
