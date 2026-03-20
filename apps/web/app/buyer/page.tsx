import { JobTimeline } from "../../components/job-timeline";
import { PolicyCard } from "../../components/policy-card";
import { WalletPanel } from "../../components/wallet-panel";
import { sampleJob } from "../../lib/sample-data";

export default function BuyerPage() {
  return (
    <main className="container grid">
      <section className="card">
        <h1>Create job</h1>
        <p className="muted">Smallest MVP buyer flow: define the errand, bind spend permissions, fund staged escrow, then watch the receipts timeline.</p>
        <div className="grid">
          <input className="input" placeholder="Job title" defaultValue={sampleJob.title} />
          <input className="input" placeholder="Coarse area" defaultValue={sampleJob.coarseArea} />
          <textarea className="textarea" placeholder="Exact destination (hidden until acceptance)" defaultValue="Encrypted exact destination + handoff note" />
          <input className="input" placeholder="Hidden buyer max budget" defaultValue="40 cUSD" />
          <div className="stage-row">
            <input className="input" placeholder="Scout fee" defaultValue="4" />
            <input className="input" placeholder="Arrival fee" defaultValue="6" />
            <input className="input" placeholder="Heartbeat fee" defaultValue="5" />
            <input className="input" placeholder="Completion bonus" defaultValue="20" />
          </div>
        </div>
      </section>
      <WalletPanel />
      <PolicyCard policy={sampleJob.policy} />
      <section className="card">
        <h3>What stays private</h3>
        <ul>
          {sampleJob.keptPrivate.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
      <JobTimeline job={sampleJob} />
    </main>
  );
}
