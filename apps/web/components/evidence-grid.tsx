import type { EvidenceResponse } from "@queuekeeper/shared";
import { AgentIdentityCard } from "./agent-identity-card";

export function EvidenceGrid({ evidence }: { evidence: EvidenceResponse }) {
  return (
    <main className="container stack fade-in">
      <section className="card hero-card">
        <span className="badge-pill">Sponsor evidence</span>
        <h1 className="hero-headline" style={{ maxWidth: "12ch", fontSize: "clamp(2.6rem, 4vw, 4.2rem)" }}>
          One coherent product, multiple honest receipts.
        </h1>
        <p className="hero-copy muted">
          QueueKeeper treats the agent, the payment rail, the verification gate, and the private planner as load-bearing parts of one procurement system.
        </p>
      </section>
      <div className="dashboard-grid">
        <div className="grid">
          {evidence.evidence.map((item) => (
            <section key={item.id} className="card">
              <div className="action-row">
                <div className="stack-tight">
                  <span className="eyebrow">{item.sponsor}</span>
                  <strong>{item.label}</strong>
                </div>
                <span className={`chip ${item.status === "live" ? "success" : item.status === "partial" ? "warning" : "info"}`}>{item.status}</span>
              </div>
              <p className="muted" style={{ marginTop: 12 }}>{item.summary}</p>
              {item.href ? <a className="button secondary" href={item.href} rel="noreferrer" target="_blank">Open evidence</a> : null}
            </section>
          ))}
        </div>
        <aside className="summary-column">
          <AgentIdentityCard identity={evidence.identity} />
          <section className="card">
            <span className="eyebrow">Artifacts</span>
            <h3 className="section-title">Submission files</h3>
            <div className="cta-row">
              <a className="button secondary" href="/agent.json" rel="noreferrer" target="_blank">agent.json</a>
              <a className="button secondary" href="/agent_log.json" rel="noreferrer" target="_blank">agent_log.json</a>
            </div>
          </section>
          <section className="card">
            <span className="eyebrow">Live sponsor rails</span>
            <h3 className="section-title">Run the sidecars from the product flow</h3>
            <p className="muted">
              Uniswap funding normalization lives in task creation and the command center. The x402 paid venue hint runs inside the command center before the next agent decision.
            </p>
            <div className="cta-row" style={{ marginTop: 12 }}>
              <a className="button secondary" href="/agent">Open Agent Mode</a>
              <a className="button secondary" href="/tasks">Open task feed</a>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
