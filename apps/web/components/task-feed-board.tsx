import type { QueueJobView } from "@queuekeeper/shared";

function visibilityLabel(task: QueueJobView) {
  return task.mode === "VERIFIED_POOL" ? "Any verified runner can inspect the redacted brief." : "This task is reserved for a chosen runner after verification.";
}

export function TaskFeedBoard({ tasks }: { tasks: QueueJobView[] }) {
  return (
    <div className="job-list-grid fade-in">
      {tasks.map((task) => (
        <section key={task.id} className="card task-feed-card">
          <div className="action-row">
            <div className="stack-tight">
              <span className="eyebrow">{task.mode === "VERIFIED_POOL" ? "Open claim pool" : "Directed dispatch"}</span>
              <h3 className="subsection-title">{task.title}</h3>
              <span className="muted">{task.coarseArea}</span>
            </div>
            <span className="chip info">{task.status}</span>
          </div>

          <div className="feed-highlights">
            <div className="summary-tile">
              <span className="eyebrow">What the runner sees now</span>
              <strong>{task.coarseArea}</strong>
              <span className="muted">{visibilityLabel(task)}</span>
            </div>
            <div className="summary-tile">
              <span className="eyebrow">What unlocks later</span>
              <strong>{task.exactLocationHint}</strong>
              <span className="muted">Exact destination only reveals after verified acceptance.</span>
            </div>
            <div className="summary-tile">
              <span className="eyebrow">Next paid increment</span>
              <strong>{task.currentStage}</strong>
              <span className="muted">{task.payoutSummary}</span>
            </div>
          </div>

          <div className="cta-row" style={{ marginTop: 16 }}>
            <a className="button" href={`/tasks/${task.id}`}>Open task</a>
          </div>
        </section>
      ))}
    </div>
  );
}
