import type { AgentDecisionLogView } from "@queuekeeper/shared";

export function AgentLogPanel({ log }: { log: AgentDecisionLogView[] }) {
  return (
    <section className="card">
      <div className="action-row">
        <div className="stack-tight">
          <span className="eyebrow">Agent log</span>
          <h3 className="section-title">Discover → plan → execute → verify → decide</h3>
        </div>
        <span className="chip info">{log.length} entries</span>
      </div>
      <div className="timeline" style={{ marginTop: 16 }}>
        {log.map((entry) => (
          <div key={entry.id} className="timeline-item">
            <div className="action-row">
              <div className="stack-tight">
                <strong>{entry.phase}</strong>
                <span className="muted">{entry.summary}</span>
              </div>
              {entry.decision ? <span className="chip info">{entry.decision}</span> : null}
            </div>
            <div className="muted" style={{ marginTop: 10 }}>
              {entry.createdAt}
              {entry.provider ? ` · ${entry.provider}` : ""}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
