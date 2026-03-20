import Link from "next/link";
import { JobTimeline } from "../components/job-timeline";
import { sampleJob } from "../lib/sample-data";

export default function HomePage() {
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
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <Link className="button" href="/buyer">Open buyer dashboard</Link>
            <Link className="button" href="/runner/qk-1">Open runner route</Link>
          </div>
        </section>
        <section className="card">
          <h2>What was kept private</h2>
          <ul>
            {sampleJob.keptPrivate.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <p className="muted">Public job card only shows the coarse area before acceptance.</p>
        </section>
      </div>
      <JobTimeline job={sampleJob} />
    </main>
  );
}
