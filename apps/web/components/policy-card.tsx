import type { DelegationPolicyView } from "@queuekeeper/shared";

export function PolicyCard({ policy }: { policy: DelegationPolicyView }) {
  const shortValue = (value: string) => value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
  const statusText = policy.status === "granted"
    ? "Delegation active"
    : policy.status === "requested"
      ? "Awaiting wallet approval"
      : policy.status === "rejected"
        ? "Fallback mode"
        : "Fallback mode";
  const statusTone = policy.status === "granted" ? "success" : policy.status === "requested" ? "warning" : "info";

  return (
    <section className="card">
      <div className="action-row">
        <div className="stack-tight">
          <span className="eyebrow">MetaMask spend boundary</span>
          <h3 className="section-title">What your agent can spend</h3>
        </div>
        <span className={`chip ${statusTone}`}>{statusText}</span>
      </div>
      <p className="muted section-copy">{statusText}. The buyer remains in control of token, contract, expiry, and job scope.</p>
      <div className="summary-grid">
        <div className="summary-tile">
          <span className="eyebrow">Cap</span>
          <strong>{policy.spendCap}</strong>
        </div>
        <div className="summary-tile">
          <span className="eyebrow">Expiry</span>
          <strong>{policy.expiry}</strong>
        </div>
        <div className="summary-tile">
          <span className="eyebrow">Token</span>
          <strong className="mono-value">{shortValue(policy.approvedToken)}</strong>
        </div>
        <div className="summary-tile">
          <span className="eyebrow">Status</span>
          <strong>{statusText}</strong>
          <span className="muted">{policy.status}</span>
        </div>
      </div>
      <details className="detail-disclosure">
        <summary>Advanced delegation details</summary>
        <div className="stack" style={{ gap: 12, marginTop: 14 }}>
          <div className="summary-grid">
            <div className="summary-tile">
              <span className="eyebrow">Mode</span>
              <strong>{policy.mode}</strong>
            </div>
            <div className="summary-tile">
              <span className="eyebrow">Job binding</span>
              <strong className="mono-value">{policy.jobId}</strong>
            </div>
            <div className="summary-tile">
              <span className="eyebrow">Contract</span>
              <strong className="mono-value">{policy.approvedContract}</strong>
            </div>
            <div className="summary-tile" style={{ gridColumn: "1 / -1" }}>
              <span className="eyebrow">Latest result</span>
              <strong>{policy.lastResult}</strong>
              <span className="muted">Requestor: {policy.requestor ?? "none"} · updated: {policy.lastUpdatedAt ?? "not yet recorded"}</span>
            </div>
          </div>
          <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
            {policy.notes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </div>
      </details>
    </section>
  );
}
