import type { EvidenceItemView, EvidenceResponse } from "@queuekeeper/shared";
import { AgentIdentityCard } from "./agent-identity-card";

const sections: Array<{
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  items: string[];
}> = [
  {
    id: "core",
    eyebrow: "Core loop",
    title: "The rails that make the product real",
    description: "These are the load-bearing parts of the main scout-and-hold loop.",
    items: ["venice", "self", "celo", "metamask"]
  },
  {
    id: "agent",
    eyebrow: "Agent infrastructure",
    title: "Visible identity and execution receipts",
    description: "The agent is a first-class product actor, not a hidden implementation detail.",
    items: ["erc8004", "ens"]
  },
  {
    id: "sidecars",
    eyebrow: "Sidecars",
    title: "Optional rails that strengthen the story",
    description: "These tools are real, but they stay secondary to the core bounded-trust loop.",
    items: ["uniswap", "x402"]
  }
];

const whereToSee: Record<string, string> = {
  erc8004: "Agent Mode and the command center",
  venice: "Planner recommendation cards in create-task and command center",
  self: "Runner verification and reveal gate",
  metamask: "Spend boundary card and wallet/delegation flow",
  celo: "Task timeline, payouts, and explorer receipts",
  ens: "Identity cards and address fields",
  uniswap: "Optional funding tools during create-task and in the command center",
  x402: "Agent tools panel inside the command center",
  arkhai: "Receipts timeline and staged commitment framing"
};

function groupedItems(evidence: EvidenceItemView[], ids: string[]) {
  return ids.map((id) => evidence.find((item) => item.id === id)).filter(Boolean) as EvidenceItemView[];
}

export function EvidenceGrid({ evidence }: { evidence: EvidenceResponse }) {
  const surfacedIds = new Set(sections.flatMap((section) => section.items));
  const remainingItems = evidence.evidence.filter((item) => !surfacedIds.has(item.id));

  return (
    <main className="container stack fade-in">
      <section className="card hero-card">
        <span className="badge-pill">Sponsor evidence</span>
        <h1 className="hero-headline hero-headline-tight">
          One product, one trust model, multiple honest receipts.
        </h1>
        <p className="hero-copy muted">
          QueueKeeper keeps the product story concrete, then shows which protocol or sponsor rail is doing real work at each step.
        </p>
      </section>

      <section className="dashboard-grid">
        <div className="stack">
          {sections.map((section) => (
            <section key={section.id} className="stack">
              <div className="stack-tight">
                <span className="eyebrow">{section.eyebrow}</span>
                <h2 className="section-title">{section.title}</h2>
                <p className="muted section-copy">{section.description}</p>
              </div>
              <div className="evidence-section-grid">
                {groupedItems(evidence.evidence, section.items).map((item) => (
                  <article key={item.id} className="card evidence-card">
                    <div className="action-row">
                      <div className="stack-tight">
                        <span className="eyebrow">{item.sponsor}</span>
                        <h3 className="subsection-title">{item.label}</h3>
                      </div>
                      <span className={`chip ${item.status === "live" ? "success" : item.status === "partial" ? "warning" : "info"}`}>{item.status}</span>
                    </div>
                    <p className="muted">{item.summary}</p>
                    <div className="summary-tile compact-tile">
                      <span className="eyebrow">Where to see it</span>
                      <strong>{whereToSee[item.id] ?? "Evidence page"}</strong>
                    </div>
                    {item.href ? (
                      <a className="button secondary" href={item.href} rel="noreferrer" target="_blank">Open evidence</a>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ))}

          {remainingItems.length > 0 ? (
            <details className="detail-disclosure">
              <summary>Additional sponsor context</summary>
              <div className="evidence-section-grid" style={{ marginTop: 14 }}>
                {remainingItems.map((item) => (
                  <article key={item.id} className="card evidence-card">
                    <div className="action-row">
                      <div className="stack-tight">
                        <span className="eyebrow">{item.sponsor}</span>
                        <h3 className="subsection-title">{item.label}</h3>
                      </div>
                      <span className={`chip ${item.status === "live" ? "success" : item.status === "partial" ? "warning" : "info"}`}>{item.status}</span>
                    </div>
                    <p className="muted">{item.summary}</p>
                    {item.href ? (
                      <a className="button secondary" href={item.href} rel="noreferrer" target="_blank">Open evidence</a>
                    ) : null}
                  </article>
                ))}
              </div>
            </details>
          ) : null}
        </div>

        <aside className="summary-column">
          <AgentIdentityCard compact identity={evidence.identity} />
          <section className="card">
            <span className="eyebrow">Artifacts</span>
            <h3 className="section-title">Submission files</h3>
            <p className="muted">These files make the agent identity and execution trail inspectable outside the UI.</p>
            <div className="cta-row">
              <a className="button secondary" href="/agent.json" rel="noreferrer" target="_blank">agent.json</a>
              <a className="button secondary" href="/agent_log.json" rel="noreferrer" target="_blank">agent_log.json</a>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
