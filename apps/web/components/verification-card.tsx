import type { RunnerVerificationView } from "@queuekeeper/shared";

export function VerificationCard({ verification }: { verification: RunnerVerificationView }) {
  const label = verification.status === "verified"
    ? "Verified human"
    : verification.status === "pending"
      ? "Verification pending"
      : "Blocked";
  const copy = verification.status === "verified"
    ? "This runner can unlock reveal data and continue the job."
    : verification.status === "pending"
      ? "Finish verification before acceptance and destination reveal."
      : "Acceptance is blocked until a valid Self verification succeeds.";

  return (
    <section className="card">
      <span className="eyebrow">Verification</span>
      <h3 className="section-title">Runner identity state</h3>
      <div className={`chip ${verification.status === "verified" ? "success" : verification.status === "blocked" ? "danger" : "warning"}`}>{label}</div>
      <p className="muted" style={{ marginTop: 10 }}>
        {copy}
      </p>
      <p className="muted">
        Provider: {verification.provider} · verified at: {verification.verifiedAt ?? "not yet verified"}
      </p>
      <details className="detail-disclosure">
        <summary>Show verification reference</summary>
        <div className="muted mono-value" style={{ marginTop: 10 }}>{verification.reference}</div>
      </details>
    </section>
  );
}
