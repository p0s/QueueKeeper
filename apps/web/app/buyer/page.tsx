export default function BuyerPage() {
  return (
    <main className="container grid">
      <section className="card">
        <h1>Create job</h1>
        <p className="muted">Smallest MVP buyer form with staged payments and a clear delegation summary.</p>
        <div className="grid">
          <input className="input" placeholder="Job title" defaultValue="Conference merch line scout + hold" />
          <input className="input" placeholder="Coarse area" defaultValue="Moscone West / SF" />
          <textarea className="textarea" placeholder="Exact destination (hidden until acceptance)" defaultValue="Exact storefront and handoff note encrypted offchain." />
          <div className="stage-row">
            <input className="input" placeholder="Scout fee" defaultValue="4" />
            <input className="input" placeholder="Arrival fee" defaultValue="6" />
            <input className="input" placeholder="Heartbeat fee" defaultValue="5" />
            <input className="input" placeholder="Completion bonus" defaultValue="20" />
          </div>
          <div className="card">
            <strong>Delegation summary</strong>
            <div className="muted">Cap 40 cUSD · expires in 3h · QueueKeeper escrow only · stablecoin allowlist enforced in policy later.</div>
          </div>
          <button className="button">Connect wallet + fund escrow</button>
        </div>
      </section>
    </main>
  );
}
