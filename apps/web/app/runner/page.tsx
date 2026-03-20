import { sampleJobs } from "../../lib/sample-data";

export default function RunnerListPage() {
  return (
    <main className="container grid">
      <section className="card">
        <h1>Runner jobs</h1>
        <p className="muted">Mobile-first redacted job list. Exact destination stays hidden until a verified runner accepts.</p>
      </section>
      <div className="grid">
        {sampleJobs.map((job) => (
          <section key={job.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <strong>{job.title}</strong>
                <div className="muted">{job.coarseArea}</div>
              </div>
              <div className="badge">{job.status}</div>
            </div>
            <div className="muted" style={{ marginTop: 12 }}>Current stage: {job.currentStage}</div>
            <div className="muted">Payouts: {job.stages.map((stage) => `${stage.label} ${stage.amount}`).join(" · ")}</div>
            <div className="muted">Still private: {job.keptPrivate.join(", ")}</div>
            <div style={{ marginTop: 12 }}>
              <a className="button" href={`/runner/${job.id}`}>Open job</a>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
