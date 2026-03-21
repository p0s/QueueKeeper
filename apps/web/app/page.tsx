import { ExplorerPanel } from "../components/explorer-panel";
import { JobTimeline } from "../components/job-timeline";
import { PolicyCard } from "../components/policy-card";
import { getQueueKeeperCore } from "@queuekeeper/core";
import { getDefaultBuyerFormInput } from "../lib/demo-data";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const jobs = getQueueKeeperCore().listJobs("public").jobs;
  const snapshotJob = jobs[0];
  const draft = getDefaultBuyerFormInput();

  return (
    <main className="container grid">
      <div className="two-col">
        <section className="card">
          <span className="badge">Private, delegated, escrowed queue procurement</span>
          <h1>QueueKeeper</h1>
          <p className="muted">
            Hire a verified human to scout or hold a place in line while your agent pays only as onchain proofs arrive.
          </p>
          <div className="stage-row">
            <div className="card"><strong>Buyer flow</strong><div className="muted">Create job, set spend cap, fund staged escrow.</div></div>
            <div className="card"><strong>Runner flow</strong><div className="muted">Accept from mobile, submit proofs, get paid.</div></div>
            <div className="card"><strong>Privacy</strong><div className="muted">Exact destination hidden until acceptance.</div></div>
            <div className="card"><strong>Receipts</strong><div className="muted">Proof hashes + payout timeline.</div></div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
            <a className="button" href="/buyer">Open buyer dashboard</a>
            <a className="button" href="/runner">Open runner jobs</a>
            <a className="button" href="/runner/qk-1">Open active runner job</a>
          </div>
        </section>
        <section className="card">
          <h2>Live demo snapshot</h2>
          <div className="muted">
            {snapshotJob
              ? `Current stage: ${snapshotJob.currentStage}`
              : `Draft template ready: ${draft.title}`}
          </div>
          <ul>
            {jobs.map((job) => (
              <li key={job.id} style={{ marginTop: 10 }}>
                <strong>{job.title}</strong> — {job.coarseArea} · {job.status}
              </li>
            ))}
          </ul>
        </section>
      </div>
      {snapshotJob ? <PolicyCard policy={snapshotJob.policy} /> : null}
      {snapshotJob ? <JobTimeline job={snapshotJob} /> : null}
      {snapshotJob ? <ExplorerPanel links={snapshotJob.explorerLinks} /> : null}
    </main>
  );
}
