import { JobTimeline } from "../../../components/job-timeline";
import { PolicyCard } from "../../../components/policy-card";
import { VerificationCard } from "../../../components/verification-card";
import { sampleJob } from "../../../lib/sample-data";

export default async function RunnerJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;

  return (
    <main className="container grid">
      <section className="card">
        <span className="badge">Runner view · mobile first</span>
        <h1>{sampleJob.title}</h1>
        <p className="muted">Job #{jobId} · coarse area is visible now, exact destination reveals only after verified accept.</p>
      </section>
      <VerificationCard verification={sampleJob.runnerVerification} />
      <section className="card">
        <h2>Accept job</h2>
        <p className="muted">Backend checks Self-compatible verification before persisting acceptance and storing the verification reference.</p>
        <button className="button">Accept and reveal exact location</button>
      </section>
      <section className="card">
        <h2>Submit proof hashes</h2>
        <div className="grid">
          <input className="input" defaultValue="0xbbb...222" />
          <button className="button">Submit arrival proof hash</button>
          <input className="input" placeholder="0x heartbeat hash" />
          <button className="button">Submit heartbeat proof hash</button>
          <input className="input" placeholder="0x completion hash" />
          <button className="button">Submit completion proof hash</button>
        </div>
      </section>
      <PolicyCard policy={sampleJob.policy} />
      <section className="card">
        <h3>What is still private</h3>
        <ul>
          {sampleJob.keptPrivate.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
      <JobTimeline job={sampleJob} />
    </main>
  );
}
