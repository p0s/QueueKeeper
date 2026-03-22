import { getQueueKeeperCore } from "@queuekeeper/core";
import { AgentIdentityCard } from "../components/agent-identity-card";
import { TaskFeedBoard } from "../components/task-feed-board";
import { getAgentIdentityManifest, procurementThesis } from "../lib/agent-manifest";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tasks = (await getQueueKeeperCore()).listTasks("public").tasks;
  const agentIdentity = getAgentIdentityManifest();

  return (
    <main className="container hero-shell">
      <div className="hero-grid">
        <section className="card hero-card fade-in">
          <span className="badge-pill">QueueKeeper — Private Scout-and-Hold Procurement</span>
          <div className="stack" style={{ gap: 18 }}>
            <h1 className="hero-headline">Rent a human with bounded trust.</h1>
            <p className="hero-copy muted">
              {procurementThesis}
            </p>
          </div>
          <div className="proof-strip fade-in">
            <div className="metric-card">
              <span className="eyebrow">Why this works</span>
              <strong>Demand is uncertain up front</strong>
              <span className="muted">QueueKeeper buys information first and commitment later.</span>
            </div>
            <div className="metric-card">
              <span className="eyebrow">Trust model</span>
              <strong>Next verified increment only</strong>
              <span className="muted">The principal can stop after any stage instead of paying for the full promise.</span>
            </div>
            <div className="metric-card">
              <span className="eyebrow">Agent role</span>
              <strong>Escalate or stop</strong>
              <span className="muted">The agent reasons privately about whether to continue scouting or move into hold mode.</span>
            </div>
          </div>
          <div className="cta-row fade-in">
            <a className="button" href="/agent">Enter Agent Mode</a>
            <a className="button secondary" href="/human">Enter Human Mode</a>
            <a className="button secondary" href="/tasks">Browse public tasks</a>
          </div>
        </section>

        <aside className="card alt fade-in">
          <AgentIdentityCard compact identity={agentIdentity} />
        </aside>
      </div>

      <section className="stack fade-in">
        <div>
          <span className="eyebrow">Mode select</span>
          <h2 className="section-title">Choose the principal</h2>
        </div>
        <div className="trust-grid">
          <div className="card trust-card">
            <span className="chip info">Agent Mode</span>
            <strong>Let the agent spend inside a hard boundary</strong>
            <span className="muted">Private planner, bounded delegation, and execution logs make the agent a first-class economic actor.</span>
          </div>
          <div className="card trust-card">
            <span className="chip success">Human Mode</span>
            <strong>Direct principal control</strong>
            <span className="muted">Use the same private task model directly without delegating the decision loop.</span>
          </div>
          <div className="card trust-card">
            <span className="chip warning">Runner Mode</span>
            <strong>Accept only what you can prove</strong>
            <span className="muted">Verification gates reveal access, then each proof-backed increment becomes payable.</span>
          </div>
          <div className="card trust-card">
            <span className="chip danger">Privacy</span>
            <strong>Secrets stay inside the private boundary</strong>
            <span className="muted">Public APIs only expose redacted envelope data, never the exact destination or raw media.</span>
          </div>
        </div>
      </section>

      <section className="stack fade-in">
        <div>
          <span className="eyebrow">Public discovery</span>
          <h2 className="section-title">Current task feed</h2>
        </div>
        <TaskFeedBoard tasks={tasks} />
      </section>
    </main>
  );
}
