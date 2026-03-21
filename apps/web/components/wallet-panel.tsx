"use client";

import { useState } from "react";

type WalletPanelProps = {
  connected?: boolean;
  funded?: boolean;
  onDelegationStateChange?: (active: boolean) => void;
};

type BrowserEthereum = {
  request?: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
};

export function WalletPanel({ connected = false, funded = false, onDelegationStateChange }: WalletPanelProps) {
  const [status, setStatus] = useState(connected ? "connected" : "not connected");
  const [account, setAccount] = useState<string | null>(null);
  const [delegationStatus, setDelegationStatus] = useState("not requested");

  function getEthereum(): BrowserEthereum | undefined {
    if (typeof window === "undefined") return undefined;
    return (window as Window & { ethereum?: BrowserEthereum }).ethereum;
  }

  async function handleConnect() {
    const ethereum = getEthereum();
    if (!ethereum?.request) {
      setStatus("MetaMask not detected");
      return;
    }

    try {
      const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
      const first = accounts?.[0] ?? null;
      setAccount(first);
      setStatus(first ? "connected" : "no account returned");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "wallet request failed");
    }
  }

  async function handleDelegationRequest() {
    const ethereum = getEthereum();
    if (!ethereum?.request) {
      setDelegationStatus("MetaMask not detected");
      return;
    }

    try {
      await ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }]
      });

      setDelegationStatus("advanced permission request sent");
      onDelegationStateChange?.(true);
    } catch (error) {
      setDelegationStatus(error instanceof Error ? error.message : "delegation request failed");
      onDelegationStateChange?.(false);
    }
  }

  return (
    <section className="card">
      <h3>Wallet connect + delegation</h3>
      <p className="muted">
        QueueKeeper is wired for MetaMask Smart Accounts / Advanced Permissions. The live-compatible request path preserves the same policy shape as the fallback: spend cap, expiry, token allowlist, contract allowlist, and job binding.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
        <button className="button" onClick={handleConnect} type="button">Connect MetaMask</button>
        <button className="button" onClick={handleDelegationRequest} type="button">Request advanced permission</button>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
        <div className="badge">Wallet: {status}</div>
        <div className="badge">Account: {account ?? "none"}</div>
        <div className="badge">Delegation: {delegationStatus}</div>
        <div className="badge">Escrow: {funded ? "funded" : "not funded"}</div>
      </div>
      <p className="muted" style={{ marginTop: 12 }}>
        If MetaMask Advanced Permissions / Delegation Toolkit is unavailable in the current browser context, QueueKeeper falls back to the bounded job-specific policy record already shown in the buyer flow.
      </p>
    </section>
  );
}
