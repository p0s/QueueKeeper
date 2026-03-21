import { getQueueKeeperCore } from "@queuekeeper/core";

export const dynamic = "force-dynamic";

export default async function RunnerListPage() {
  const jobs = (await getQueueKeeperCore()).listJobs("public").jobs;

  return (
    <main className="container job-list-shell">
      <section className="card fade-in">
        <span className="badge-pill">Runner intake</span>
        <h1 className="hero-headline" style={{ maxWidth: "10ch", fontSize: "clamp(2.4rem, 5vw, 4rem)" }}>
          Accept only what you can prove.
        </h1>
        <p className="hero-copy muted">
          Browse redacted queue jobs, verify as a human, unlock the exact destination only after acceptance, and collect staged cUSD as proofs arrive.
        </p>
      </section>
      <div className="job-list-grid fade-in">
        {jobs.map((job) => (
          <section key={job.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div className="stack-tight">
                <strong>{job.title}</strong>
                <div className="muted">{job.coarseArea}</div>
              </div>
              <div className="chip info">{job.status}</div>
            </div>
            <div className="summary-grid" style={{ marginTop: 14 }}>
              <div className="summary-tile">
                <span className="eyebrow">Mode</span>
                <strong>{job.mode ?? "DIRECT_DISPATCH"}</strong>
              </div>
              <div className="summary-tile">
                <span className="eyebrow">Current stage</span>
                <strong>{job.currentStage}</strong>
              </div>
              <div className="summary-tile">
                <span className="eyebrow">Payout rail</span>
                <strong>{job.payoutSummary}</strong>
              </div>
              <div className="summary-tile">
                <span className="eyebrow">Private until accept</span>
                <strong>{job.exactLocationHint ?? "Exact destination hidden"}</strong>
              </div>
            </div>
            <div className="status-banner" style={{ marginTop: 14 }}>
              Still private: {job.keptPrivate.join(", ")}
            </div>
            <div style={{ marginTop: 14 }}>
              <a className="button" href={`/runner/${job.id}`}>Open job</a>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
