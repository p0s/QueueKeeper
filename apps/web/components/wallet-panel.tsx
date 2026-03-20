"use client";

import { useState } from "react";

export function WalletPanel({ connected = false, funded = false }: { connected?: boolean; funded?: boolean }) {
  const [status, setStatus] = useState(connected ? "connected" : "not connected");

  async function handleConnect() {
    if (typeof window !== "undefined" && (window as Window & { ethereum?: unknown }).ethereum) {
      setStatus("MetaMask detected");
      return;
    }
    setStatus("MetaMask not detected");
  }

  return (
    <section className="card">
      <h3>Wallet connect + funding</h3>
      <p className="muted">
        QueueKeeper is wired for MetaMask-style smart account / advanced permissions integration. The current fallback remains bounded and job-specific when live delegation credentials are unavailable.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
        <button className="button" onClick={handleConnect} type="button">Check MetaMask</button>
        <div className="badge">Wallet: {status}</div>
        <div className="badge">Escrow: {funded ? "funded" : "not funded"}</div>
      </div>
      <p className="muted" style={{ marginTop: 12 }}>
        Live hook point: replace the demo funding action with MetaMask Smart Accounts / Advanced Permissions (ERC-7715) or Delegation Framework-backed execution, while preserving spend cap, expiry, token allowlist, contract allowlist, and job binding.
      </p>
    </section>
  );
}
