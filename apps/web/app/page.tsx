import { getQueueKeeperCore } from "@queuekeeper/core";
import { LandingModeHero } from "../components/landing-mode-hero";
import { TrustLoopIllustration } from "../components/minimalist-graphics";
import { TaskFeedBoard } from "../components/task-feed-board";

const benefitCards = [
  ["Direct buyer decisions", "Stop or continue on your terms."],
  ["Reveal stays gated", "Exact location unlocks after verified acceptance."],
  ["Live Celo rail", "Payouts move as proof-backed steps arrive."],
  ["Self-gated acceptance", "Only verified runners can accept."]
] as const;

const loopSteps = [
  {
    step: "Scout",
    detail: "Proof + first release"
  },
  {
    step: "Hold",
    detail: "Heartbeat + repeated release"
  },
  {
    step: "Complete",
    detail: "Final proof + bounded close"
  }
] as const;

const sponsorRails = [
  {
    sponsor: "Protocol Labs",
    label: "ERC-8004 agent identity"
  },
  {
    sponsor: "Venice",
    label: "Private planner"
  },
  {
    sponsor: "Self",
    label: "Verified acceptance"
  },
  {
    sponsor: "Celo",
    label: "Micropayments"
  },
  {
    sponsor: "Uniswap",
    label: "Budget normalization"
  },
  {
    sponsor: "Base / x402",
    label: "Paid venue hint"
  }
] as const;

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const core = await getQueueKeeperCore();
  const tasks = core.listTasks("public").tasks;

  return (
    <main className="container hero-shell">
      <LandingModeHero />

      <section className="stack fade-in">
        <div>
          <span className="eyebrow">What you get</span>
          <h2 className="section-title">Direct control, same trust model</h2>
        </div>
        <div className="why-grid">
          {benefitCards.map(([title, body]) => (
            <section key={title} className="card why-card">
              <h3 className="subsection-title">{title}</h3>
              <p className="muted">{body}</p>
            </section>
          ))}
        </div>
      </section>

      <section className="stack fade-in">
        <div>
          <span className="eyebrow">How it works</span>
          <h2 className="section-title">Scout → Hold → Complete</h2>
        </div>
        <div className="loop-illustration-shell">
          <TrustLoopIllustration />
        </div>
        <div className="loop-grid">
          {loopSteps.map((step) => (
            <section key={step.step} className="card loop-card">
              <h3 className="subsection-title">{step.step}</h3>
              <p className="muted">{step.detail}</p>
            </section>
          ))}
        </div>
      </section>

      <section className="stack fade-in">
        <div className="action-row">
          <div className="stack-tight">
            <span className="eyebrow">Supported rails</span>
            <h2 className="section-title">Built with</h2>
          </div>
          <a className="button secondary" href="/evidence">Open sponsor evidence</a>
        </div>
        <div className="sponsor-grid">
          {sponsorRails.map((item) => (
            <section key={item.label} className="card sponsor-card">
              <span className="eyebrow">{item.sponsor}</span>
              <h3 className="subsection-title">{item.label}</h3>
            </section>
          ))}
        </div>
      </section>

      <section className="stack fade-in">
        <div>
          <span className="eyebrow">Public tasks</span>
          <h2 className="section-title">Public tasks, private intent</h2>
        </div>
        <TaskFeedBoard tasks={tasks} />
      </section>
    </main>
  );
}
