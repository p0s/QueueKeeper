import type { DelegationPolicyView } from "@queuekeeper/shared";

export function PolicyCard({ policy }: { policy: DelegationPolicyView }) {
  const statusText = policy.status === "granted"
    ? "MetaMask delegation succeeded for this job."
    : policy.status === "requested"
      ? "Permission request sent. It is not active until the wallet confirms."
      : policy.status === "rejected"
        ? "The last MetaMask permission request failed. The demo fallback record is still in force."
        : "The demo fallback policy record is active. No live MetaMask delegation has succeeded yet.";

  return (
    <section className="card">
      <h3>Bounded permission policy</h3>
      <div className="muted" style={{ marginBottom: 12 }}>{statusText}</div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div><strong>Mode</strong><div className="muted">{policy.mode}</div></div>
        <div><strong>Status</strong><div className="muted">{policy.status}</div></div>
        <div><strong>Spend cap</strong><div className="muted">{policy.spendCap}</div></div>
        <div><strong>Expiry</strong><div className="muted">{policy.expiry}</div></div>
        <div><strong>Token</strong><div className="muted">{policy.approvedToken}</div></div>
        <div><strong>Contract</strong><div className="muted">{policy.approvedContract}</div></div>
        <div><strong>Job binding</strong><div className="muted">{policy.jobId}</div></div>
      </div>
      <div className="card" style={{ marginTop: 12, padding: 12 }}>
        <strong>Latest result</strong>
        <div className="muted" style={{ marginTop: 8 }}>{policy.lastResult}</div>
        <div className="muted" style={{ marginTop: 8 }}>
          Requestor: {policy.requestor ?? "none"} · updated: {policy.lastUpdatedAt ?? "not yet recorded"}
        </div>
      </div>
      <ul style={{ marginTop: 12 }}>
        {policy.notes.map((note) => <li key={note}>{note}</li>)}
      </ul>
    </section>
  );
}
