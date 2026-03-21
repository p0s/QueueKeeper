import { ExplorerPanel } from "../components/explorer-panel";
import { JobTimeline } from "../components/job-timeline";
import { PolicyCard } from "../components/policy-card";
import { getQueueKeeperCore } from "@queuekeeper/core";
import { getDefaultBuyerFormInput } from "../lib/demo-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const jobs = (await getQueueKeeperCore()).listJobs("public").jobs;
  const snapshotJob = jobs[0];
  const draft = getDefaultBuyerFormInput();
  const nextAction = snapshotJob?.stages.find((stage) => stage.status === "pending-proof" || stage.status === "submitted");

  return (
    <main className="container hero-shell">
      <div className="hero-grid">
        <section className="card hero-card fade-in">
          <span className="badge-pill">Dispatch-first private queue operations</span>
          <div className="stack" style={{ gap: 18 }}>
            <h1 className="hero-headline">Privately dispatch a verified human to scout or hold your place in line.</h1>
            <p className="hero-copy muted">
              QueueKeeper keeps the destination encrypted, unlocks it only after verified acceptance, and releases cUSD stage by stage as proof arrives.
            </p>
          </div>
          <div className="proof-strip fade-in">
            <div className="metric-card">
              <span className="eyebrow">Privacy</span>
              <strong>Private destination</strong>
              <span className="muted">Exact location stays encrypted until an authorized runner accepts.</span>
            </div>
            <div className="metric-card">
              <span className="eyebrow">Verification</span>
              <strong>Verified runner</strong>
              <span className="muted">Self-backed acceptance gates who can see reveal data.</span>
            </div>
            <div className="metric-card">
              <span className="eyebrow">Payouts</span>
              <strong>Stage-based payout</strong>
              <span className="muted">Scout, arrival, repeated heartbeats, and completion all reconcile separately.</span>
            </div>
          </div>
          <div className="cta-row fade-in">
            <a className="button" href="/buyer">Create dispatch job</a>
            <a className="button secondary" href="/runner">See runner flow</a>
            {snapshotJob ? <a className="button secondary" href={`/runner/${snapshotJob.id}`}>Open live runner job</a> : null}
          </div>
        </section>

        <aside className="card alt fade-in">
          <span className="eyebrow">Dispatch-first live loop</span>
          <h2 className="section-title">Current operations snapshot</h2>
          <div className="summary-grid">
            <div className="summary-tile">
              <span className="eyebrow">Mode</span>
              <strong>{snapshotJob?.mode ?? "DIRECT_DISPATCH"}</strong>
              <span className="muted">{snapshotJob?.title ?? draft.title}</span>
            </div>
            <div className="summary-tile">
              <span className="eyebrow">Current stage</span>
              <strong>{snapshotJob?.currentStage ?? "Draft template ready"}</strong>
              <span className="muted">{snapshotJob?.status ?? "draft"}</span>
            </div>
            <div className="summary-tile">
              <span className="eyebrow">Next action</span>
              <strong>{nextAction?.label ?? "Post dispatch job"}</strong>
              <span className="muted">{nextAction ? nextAction.status : "Buyer setup required"}</span>
            </div>
            <div className="summary-tile">
              <span className="eyebrow">Payout rail</span>
              <strong>{snapshotJob?.payoutSummary ?? `${draft.maxSpendUsd.toFixed(2)} cUSD reserved`}</strong>
              <span className="muted">Celo stablecoin micropayments with explorer receipts.</span>
            </div>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            {jobs.slice(0, 2).map((job) => (
              <div key={job.id} className="metric-card">
                <strong>{job.title}</strong>
                <span className="muted">{job.coarseArea} · {job.status}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <section className="stack fade-in">
        <div>
          <span className="eyebrow">Trust rail</span>
          <h2 className="section-title">Built for one crisp, verifiable loop</h2>
        </div>
        <div className="trust-grid">
          <div className="card trust-card">
            <span className="chip info">Delegation</span>
            <strong>Bounded agent spend</strong>
            <span className="muted">Spend cap, expiry, token, contract, and job binding stay explicit.</span>
          </div>
          <div className="card trust-card">
            <span className="chip success">Escrow</span>
            <strong>Micropayments on proof</strong>
            <span className="muted">Escrow holds the budget while proofs, approvals, and auto-release timers advance payout.</span>
          </div>
          <div className="card trust-card">
            <span className="chip warning">Receipts</span>
            <strong>Explainable timeline</strong>
            <span className="muted">Every stage carries status, timestamps, proof references, and settlement outcomes.</span>
          </div>
          <div className="card trust-card">
            <span className="chip danger">Privacy</span>
            <strong>Secrets stay inside the private boundary</strong>
            <span className="muted">Public APIs only expose redacted envelope data, never the exact destination or raw media.</span>
          </div>
        </div>
      </section>

      {snapshotJob ? <PolicyCard policy={snapshotJob.policy} /> : null}
      {snapshotJob ? <JobTimeline job={snapshotJob} /> : null}
      {snapshotJob ? <ExplorerPanel links={snapshotJob.explorerLinks} /> : null}
    </main>
  );
}
