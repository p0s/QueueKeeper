import type { RunnerVerificationView } from "@queuekeeper/shared";

export function VerificationCard({ verification }: { verification: RunnerVerificationView }) {
  const label = verification.status === "verified"
    ? "Verified human"
    : verification.status === "pending"
      ? "Verification pending"
      : "Blocked";

  return (
    <section className="card">
      <h3>Runner verification</h3>
      <div className="badge">{label}</div>
      <p className="muted" style={{ marginTop: 10 }}>
        Provider: {verification.provider} · reference: {verification.reference}
      </p>
      <p className="muted">
        Accept is gated by the backend adapter before a runner can reveal exact location or submit proofs.
      </p>
    </section>
  );
}
