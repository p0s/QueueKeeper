import type { DelegationPolicyView } from "@queuekeeper/shared";

export function PolicyCard({ policy }: { policy: DelegationPolicyView }) {
  return (
    <section className="card">
      <h3>Bounded permission policy</h3>
      <div className="muted" style={{ marginBottom: 12 }}>
        {policy.mode === "metamask-delegation"
          ? "Live MetaMask delegation is active for this job."
          : "Temporary compatible fallback until live MetaMask delegation is wired in."}
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div><strong>Spend cap</strong><div className="muted">{policy.spendCap}</div></div>
        <div><strong>Expiry</strong><div className="muted">{policy.expiry}</div></div>
        <div><strong>Token</strong><div className="muted">{policy.approvedToken}</div></div>
        <div><strong>Contract</strong><div className="muted">{policy.approvedContract}</div></div>
        <div><strong>Job binding</strong><div className="muted">{policy.jobId}</div></div>
      </div>
      <ul style={{ marginTop: 12 }}>
        {policy.notes.map((note) => <li key={note}>{note}</li>)}
      </ul>
    </section>
  );
}
