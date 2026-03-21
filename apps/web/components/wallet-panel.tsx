"use client";

import { useEffect, useState } from "react";
import type { DelegationPolicyView, QueueJobView } from "@queuekeeper/shared";
import { requestQueueKeeperAdvancedPermissions } from "../lib/metamask-smart-account";
import { updateDemoDelegation } from "../lib/agent-client";

type WalletPanelProps = {
  connected?: boolean;
  funded?: boolean;
  jobId?: string;
  buyerToken?: string | null;
  policy?: DelegationPolicyView;
  onPolicyUpdated?: (job: QueueJobView) => void;
};

type BrowserEthereum = {
  request?: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
};

export function WalletPanel({ connected = false, funded = false, jobId, buyerToken, policy, onPolicyUpdated }: WalletPanelProps) {
  const [status, setStatus] = useState(connected ? "connected" : "not connected");
  const [account, setAccount] = useState<string | null>(null);
  const [delegationStatus, setDelegationStatus] = useState(policy?.lastResult ?? "not requested");
  const shortAccount = account ? `${account.slice(0, 8)}…${account.slice(-6)}` : "none";

  useEffect(() => {
    setDelegationStatus(policy?.lastResult ?? "not requested");
  }, [policy?.lastResult]);

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
      await requestQueueKeeperAdvancedPermissions({
        chainId: Number(process.env.NEXT_PUBLIC_CELO_CHAIN_ID ?? 11142220),
        expiry: Math.floor(Date.now() / 1000) + 3 * 3600,
        tokenAddress: (policy?.approvedToken ?? process.env.NEXT_PUBLIC_QUEUEKEEPER_TOKEN_ADDRESS ?? "0xEeA30fA689535f7FB45a8A91045E3b1d1c54A3d6") as `0x${string}`,
        contractAddress: (policy?.approvedContract ?? process.env.NEXT_PUBLIC_QUEUEKEEPER_ESCROW_ADDRESS ?? "0xb566298bf1c1afa55f0edc514b2f9d990c82f98c") as `0x${string}`,
        spendCap: BigInt(Math.round(Number(policy?.spendCap.split(" ")[0] ?? "40"))) * 10n ** 18n,
        justification: "QueueKeeper job-specific queue procurement permission with capped spend and expiry"
      });

      const result = `ERC-7715 permission request succeeded${account ? ` for ${account}` : ""}.`;
      setDelegationStatus(result);
      if (jobId && buyerToken) {
        const job = await updateDemoDelegation(jobId, buyerToken, {
          mode: "metamask-delegation",
          status: "granted",
          requestor: account,
          result
        });
        onPolicyUpdated?.(job);
      }
    } catch (error) {
      const result = error instanceof Error ? error.message : "delegation request failed";
      setDelegationStatus(result);
      if (jobId && buyerToken) {
        const job = await updateDemoDelegation(jobId, buyerToken, {
          mode: "metamask-delegation",
          status: "rejected",
          requestor: account,
          result
        });
        onPolicyUpdated?.(job);
      }
    }
  }

  return (
    <section className="card">
      <span className="eyebrow">Wallet rail</span>
      <h3 className="section-title">Connect wallet and capture delegation</h3>
      <p className="muted section-copy">
        QueueKeeper keeps the permission boundary visible: spend cap, expiry, token, contract, and job binding. The job still works in fallback mode if a live permission request is unavailable.
      </p>
      <div className="cta-row" style={{ marginTop: 12 }}>
        <button className="button secondary" onClick={handleConnect} type="button">Connect MetaMask</button>
        <button className="button" disabled={!jobId || !buyerToken} onClick={handleDelegationRequest} type="button">
          Request advanced permission
        </button>
      </div>
      <div className="summary-grid" style={{ marginTop: 12 }}>
        <div className="summary-tile"><span className="eyebrow">Wallet</span><strong>{status}</strong></div>
        <div className="summary-tile"><span className="eyebrow">Account</span><strong className="mono-value">{shortAccount}</strong></div>
        <div className="summary-tile"><span className="eyebrow">Delegation</span><strong>{policy?.status === "granted" ? "Active" : policy?.status === "requested" ? "Awaiting approval" : "Fallback mode"}</strong></div>
        <div className="summary-tile"><span className="eyebrow">Escrow</span><strong>{funded ? "Funded" : "Not funded"}</strong></div>
      </div>
      <details className="detail-disclosure">
        <summary>Latest wallet result</summary>
        <div className="muted" style={{ marginTop: 12 }}>{delegationStatus}</div>
        <p className="muted" style={{ marginTop: 12 }}>
          If MetaMask Advanced Permissions / Delegation Toolkit is unavailable in the current browser context, QueueKeeper keeps the demo fallback policy record active instead of pretending delegation succeeded.
        </p>
      </details>
    </section>
  );
}
