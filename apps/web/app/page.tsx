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
    label: "ERC-8004 agent identity",
    detail: "Hand the task to your agent through a public skill entrypoint."
  },
  {
    sponsor: "Venice",
    label: "Private planner",
    detail: "Plan from hidden details without leaking them."
  },
  {
    sponsor: "Self",
    label: "Verified acceptance",
    detail: "Only verified runners unlock the destination."
  },
  {
    sponsor: "Celo",
    label: "Micropayments",
    detail: "Pay per step instead of trusting a full escrowed promise."
  },
  {
    sponsor: "Uniswap",
    label: "Budget normalization",
    detail: "Top up the payout rail with one swap."
  },
  {
    sponsor: "Base / x402",
    label: "Paid venue hint",
    detail: "Buy one paid venue hint before you commit."
  }
] as const;

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tasks = (await getQueueKeeperCore()).listTasks("public").tasks;

  return (
    <main className="container hero-shell">
      <LandingModeHero />

      <section className="stack fade-in">
        <div className="action-row">
          <div className="stack-tight">
            <span className="eyebrow">Supported rails</span>
            <h2 className="section-title">Built with</h2>
          </div>
          <div className="cta-row">
            <a className="button secondary" href="/evidence">Open sponsor evidence</a>
            <a className="micro-link" href="https://github.com/p0s/QueueKeeper" rel="noreferrer" target="_blank">GitHub repo</a>
          </div>
        </div>
        <div className="sponsor-grid">
          {sponsorRails.map((item) => (
            <section key={item.label} className="card sponsor-card">
              <span className="eyebrow">{item.sponsor}</span>
              <h3 className="subsection-title">{item.label}</h3>
              <p className="muted">{item.detail}</p>
            </section>
          ))}
        </div>
      </section>

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
        <div>
          <span className="eyebrow">Public tasks</span>
          <h2 className="section-title">Public tasks, private intent</h2>
        </div>
        <TaskFeedBoard tasks={tasks} />
      </section>
    </main>
  );
}
