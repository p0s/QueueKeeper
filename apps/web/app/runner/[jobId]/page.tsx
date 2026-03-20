import { sampleJob } from "../../../lib/sample-data";

export default async function RunnerJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  return (
    <main className="container grid">
      <section className="card">
        <span className="badge">Runner view · mobile first</span>
        <h1>{sampleJob.title}</h1>
        <p className="muted">Job #{jobId} · Coarse area shown before acceptance, exact location released after accept.</p>
      </section>
      <section className="card">
        <h2>Accept job</h2>
        <p className="muted">Verified runner badge and Self integration slot land here.</p>
        <button className="button">Accept and reveal exact location</button>
      </section>
      <section className="card">
        <h2>Submit proof</h2>
        <div className="grid">
          <button className="button">Submit arrival proof hash</button>
          <button className="button">Submit heartbeat proof hash</button>
          <button className="button">Submit completion proof hash</button>
        </div>
      </section>
    </main>
  );
}
