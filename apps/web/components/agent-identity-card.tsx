import type { AgentIdentityView } from "@queuekeeper/shared";
import { shortAddress } from "../lib/agent-manifest";

export function AgentIdentityCard({
  identity,
  compact = false
}: {
  identity: AgentIdentityView;
  compact?: boolean;
}) {
  return (
    <section className="card alt">
      <span className="eyebrow">Synthesis agent</span>
      <h3 className="section-title">{identity.name}</h3>
      <p className="muted">{identity.role}</p>
      <div className="summary-grid" style={{ marginTop: 14 }}>
        <div className="summary-tile">
          <span className="eyebrow">Mode</span>
          <strong>{identity.mode}</strong>
        </div>
        <div className="summary-tile">
          <span className="eyebrow">Harness</span>
          <strong>{identity.harness}</strong>
        </div>
        <div className="summary-tile">
          <span className="eyebrow">Model</span>
          <strong>{identity.model}</strong>
        </div>
        <div className="summary-tile">
          <span className="eyebrow">Identity</span>
          <strong>{identity.ensName ?? shortAddress(identity.walletAddress)}</strong>
        </div>
      </div>
      {!compact ? (
        <>
          <div className="status-banner" style={{ marginTop: 14 }}>{identity.receiptPolicy}</div>
          <ul className="muted" style={{ marginTop: 14, paddingLeft: 18 }}>
            {identity.safetySummary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {identity.registrationUrl ? (
            <a className="button secondary" href={identity.registrationUrl} rel="noreferrer" target="_blank">
              Open ERC-8004 registration
            </a>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
