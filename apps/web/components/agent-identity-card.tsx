"use client";

import type { AgentIdentityView } from "@queuekeeper/shared";
import { shortAddress } from "../lib/agent-manifest";
import { useEnsIdentity } from "../lib/ens";

export function AgentIdentityCard({
  identity,
  compact = false
}: {
  identity: AgentIdentityView;
  compact?: boolean;
}) {
  const resolved = useEnsIdentity(identity.ensName ? null : identity.walletAddress);
  const displayIdentity = identity.ensName ?? resolved.ensName ?? shortAddress(identity.walletAddress);

  return (
    <section className="card alt">
      <span className="eyebrow">Synthesis agent</span>
      <h3 className="section-title">{identity.name}</h3>
      <p className="muted">{identity.role}</p>
      <div className={`summary-grid ${compact ? "compact-grid" : ""}`} style={{ marginTop: 14 }}>
        <div className="summary-tile">
          <span className="eyebrow">Mode</span>
          <strong>{identity.mode}</strong>
        </div>
        {!compact ? (
          <div className="summary-tile">
            <span className="eyebrow">Harness</span>
            <strong>{identity.harness}</strong>
          </div>
        ) : null}
        <div className="summary-tile">
          <span className="eyebrow">{compact ? "Capability" : "Model"}</span>
          <strong>{compact ? "Private planner + execution loop" : identity.model}</strong>
        </div>
        <div className="summary-tile">
          <span className="eyebrow">Identity</span>
          <strong>{displayIdentity}</strong>
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
