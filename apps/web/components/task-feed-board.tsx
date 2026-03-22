"use client";

import type { QueueJobView } from "@queuekeeper/shared";

function visibilityLabel(task: QueueJobView) {
  return task.mode === "VERIFIED_POOL"
    ? "Any verified runner can inspect the redacted brief."
    : "This posted task is public until a runner accepts it. Any selected runner stays a private preference.";
}

export function TaskFeedBoard({ tasks }: { tasks: QueueJobView[] }) {
  if (tasks.length === 0) {
    return (
      <section className="card task-feed-card task-feed-empty">
        <div className="stack-tight">
          <span className="eyebrow">No open tasks right now</span>
          <h3 className="subsection-title">Nothing is currently available to claim.</h3>
          <p className="muted">
            Posted tasks appear here after a principal posts a redacted brief. Check back soon or open the homepage
            to create the next task.
          </p>
        </div>
        <div className="cta-row">
          <a className="button secondary" href="/">Back to homepage</a>
          <a className="micro-link" href="/human">Post a task</a>
        </div>
      </section>
    );
  }

  return (
    <div className="job-list-grid fade-in">
      {tasks.map((task) => (
        <section key={task.id} className="card task-feed-card">
          <div className="action-row">
            <div className="stack-tight">
              <span className="eyebrow">{task.mode === "VERIFIED_POOL" ? "Earnable task" : "Directed dispatch"}</span>
              <h3 className="subsection-title">{task.title}</h3>
              <span className="muted">{task.coarseArea}</span>
            </div>
          <span className="chip info">{task.status}</span>
          </div>

          <div className="feed-highlights">
            <div className="summary-tile">
              <span className="eyebrow">What you know now</span>
              <strong>{task.coarseArea}</strong>
              <span className="muted">{visibilityLabel(task)}</span>
            </div>
            <div className="summary-tile">
              <span className="eyebrow">Unlock after accept</span>
              <strong>{task.exactLocationHint}</strong>
              <span className="muted">Exact destination only reveals after verified acceptance.</span>
            </div>
            <div className="summary-tile">
              <span className="eyebrow">Next paid step</span>
              <strong>{task.currentStage}</strong>
              <span className="muted">{task.payoutSummary}</span>
            </div>
          </div>
          <p className="muted" style={{ marginTop: 12 }}>{task.publicListingReason}</p>

          <div className="cta-row" style={{ marginTop: 16 }}>
            <a className="button" href={`/tasks/${task.id}`}>View task</a>
          </div>
        </section>
      ))}
    </div>
  );
}
