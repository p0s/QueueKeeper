import { getQueueKeeperCore } from "@queuekeeper/core";
import { AgentIdentityCard } from "../components/agent-identity-card";
import { TaskFeedBoard } from "../components/task-feed-board";
import { getAgentIdentityManifest } from "../lib/agent-manifest";

const whyCards = [
  {
    eyebrow: "Buy information first",
    title: "Scout before you commit",
    body: "QueueKeeper buys the first useful signal before a buyer locks into a longer hold."
  },
  {
    eyebrow: "Reveal only after verification",
    title: "Private details stay locked",
    body: "Exact destination, handoff details, and buyer notes stay inside the private boundary until a verified runner accepts."
  },
  {
    eyebrow: "Pay per verified step",
    title: "Every increment has receipts",
    body: "Each proof-backed step can release its own payout, so trust exposure never expands beyond the next increment."
  }
] as const;

const loopSteps = [
  {
    step: "Scout",
    proof: "Photo, line snapshot, quick status note",
    payout: "Small first release",
    right: "Buyer or runner can stop here"
  },
  {
    step: "Hold",
    proof: "Heartbeat confirmations and progress updates",
    payout: "Repeated micro-releases",
    right: "Stop after any interval"
  },
  {
    step: "Complete",
    proof: "Final handoff or completion confirmation",
    payout: "Final bounded release",
    right: "Close cleanly without overpaying early"
  }
] as const;

const sponsorRails = [
  {
    id: "erc8004",
    sponsor: "Protocol Labs",
    label: "ERC-8004 agent identity",
    role: "The agent is a visible, accountable operator with logs and registration proof."
  },
  {
    id: "venice",
    sponsor: "Venice",
    label: "Private planner",
    role: "Hidden destination and buyer intent shape the plan without leaking into public task data."
  },
  {
    id: "self",
    sponsor: "Self",
    label: "Acceptance gate",
    role: "Reveal and acceptance stay blocked until the runner clears the verification gate."
  },
  {
    id: "celo",
    sponsor: "Celo",
    label: "Micropayments",
    role: "The happy path uses staged stablecoin payouts and explorer-visible receipts."
  },
  {
    id: "uniswap",
    sponsor: "Uniswap",
    label: "Budget normalization",
    role: "Optional Sepolia swap flow can normalize budget before a task is posted."
  },
  {
    id: "x402",
    sponsor: "Base / x402",
    label: "Paid venue hint",
    role: "The agent can buy one paid signal before making the next task decision."
  }
] as const;

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const core = await getQueueKeeperCore();
  const tasks = core.listTasks("public").tasks;
  const evidence = core.getEvidence();
  const agentIdentity = getAgentIdentityManifest();

  const evidenceById = Object.fromEntries(evidence.evidence.map((item) => [item.id, item]));
  const sponsorStatus = {
    erc8004: evidenceById.erc8004?.status ?? "partial",
    venice: evidenceById.venice?.status ?? "partial",
    self: evidenceById.self?.status ?? "partial",
    celo: evidenceById.celo?.status ?? "partial",
    uniswap: evidenceById.uniswap?.status ?? "partial",
    x402: evidenceById.x402?.status ?? "partial"
  };

  return (
    <main className="container hero-shell">
      <section className="hero-grid landing-hero">
        <div className="card hero-card fade-in">
          <span className="badge-pill">Private scout-and-hold procurement</span>
          <div className="stack" style={{ gap: 14 }}>
            <h1 className="hero-headline hero-headline-tight">
              Privately procure a verified human to scout, hold, or hand off scarce real-world access.
            </h1>
            <p className="hero-copy muted">
              Pre-fund a task, reveal the destination only after verified acceptance, and pay only for each proof-backed step.
            </p>
            <p className="hero-tertiary">Bound trust to the next verified increment.</p>
          </div>
          <div className="cta-row">
            <a className="button" href="/agent">Start in Agent Mode</a>
            <a className="button secondary" href="/evidence">See live evidence</a>
          </div>
        </div>

        <aside className="hero-sidecard fade-in">
          <AgentIdentityCard compact identity={agentIdentity} />
        </aside>
      </section>

      <section className="stack fade-in">
        <div>
          <span className="eyebrow">Why it wins</span>
          <h2 className="section-title">One procurement loop, bounded trust at every step</h2>
        </div>
        <div className="why-grid">
          {whyCards.map((card) => (
            <section key={card.title} className="card why-card">
              <span className="eyebrow">{card.eyebrow}</span>
              <h3 className="subsection-title">{card.title}</h3>
              <p className="muted">{card.body}</p>
            </section>
          ))}
        </div>
      </section>

      <section className="stack fade-in">
        <div className="action-row">
          <div className="stack-tight">
            <span className="eyebrow">How the loop works</span>
            <h2 className="section-title">Scout → Hold → Complete</h2>
          </div>
          <div className="chip info">Buyer can stop after any step. Runner can stop after any step.</div>
        </div>
        <div className="loop-grid">
          {loopSteps.map((step, index) => (
            <section key={step.step} className="card loop-card">
              <div className="loop-step-index">{index + 1}</div>
              <span className="eyebrow">{step.step}</span>
              <h3 className="subsection-title">{step.step}</h3>
              <div className="loop-meta">
                <div>
                  <span className="eyebrow">Proof</span>
                  <strong>{step.proof}</strong>
                </div>
                <div>
                  <span className="eyebrow">Payout</span>
                  <strong>{step.payout}</strong>
                </div>
                <div>
                  <span className="eyebrow">Stop right</span>
                  <strong>{step.right}</strong>
                </div>
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="stack fade-in">
        <div className="action-row">
          <div className="stack-tight">
            <span className="eyebrow">Live sponsor rails</span>
            <h2 className="section-title">Load-bearing features, not decorative badges</h2>
          </div>
          <a className="button secondary" href="/evidence">Open sponsor evidence</a>
        </div>
        <div className="sponsor-grid">
          {sponsorRails.map((item) => (
            <section key={item.label} className="card sponsor-card">
              <div className="action-row">
                <span className="eyebrow">{item.sponsor}</span>
                <span className={`chip ${sponsorStatus[item.id] === "live" ? "success" : sponsorStatus[item.id] === "partial" ? "warning" : "info"}`}>
                  {sponsorStatus[item.id]}
                </span>
              </div>
              <h3 className="subsection-title">{item.label}</h3>
              <p className="muted">{item.role}</p>
            </section>
          ))}
        </div>
      </section>

      <section className="stack fade-in">
        <div>
          <span className="eyebrow">Public tasks</span>
          <h2 className="section-title">Public tasks, private intent</h2>
          <p className="muted section-copy">
            Runners see a redacted brief, the next paid increment, and what unlocks later. Exact destinations stay locked until verification and acceptance succeed.
          </p>
        </div>
        <TaskFeedBoard tasks={tasks} />
      </section>
    </main>
  );
}
