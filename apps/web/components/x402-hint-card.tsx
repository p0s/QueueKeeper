"use client";

import { useState } from "react";
import type { QueueJobView } from "@queuekeeper/shared";
import { recordAgentToolPurchase } from "../lib/agent-client";
import { buyPaidVenueHint } from "../lib/x402-client";

type X402HintCardProps = {
  taskId: string;
  buyerToken: string;
  onTaskUpdated: (task: QueueJobView) => void;
};

export function X402HintCard({ taskId, buyerToken, onTaskUpdated }: X402HintCardProps) {
  const [status, setStatus] = useState("Buy a paid venue hint on Base Sepolia and fold it back into the private planner context.");
  const [lastHint, setLastHint] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  async function handlePurchase() {
    setStatus("Purchasing venue hint over x402…");
    try {
      const purchased = await buyPaidVenueHint(taskId);
      const response = await recordAgentToolPurchase(taskId, buyerToken, {
        provider: "x402",
        network: purchased.payment.network,
        txHash: purchased.payment.transaction,
        payer: purchased.payment.payer ?? "connected-wallet",
        signal: purchased.hint
      });
      onTaskUpdated(response.job);
      setLastHint(purchased.hint.summary);
      setTxHash(purchased.payment.transaction);
      setStatus("Paid hint added to the private planner context. Let the agent decide again to use it.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to buy a paid venue hint.");
    }
  }

  return (
    <section className="card">
      <span className="eyebrow">Paid agent tools</span>
      <h3 className="section-title">Base x402 venue hint</h3>
      <p className="muted section-copy">
        The agent can buy one paid signal before deciding whether to stop, scout again, or escalate into hold mode.
      </p>
      <p className="muted" style={{ marginTop: 8 }}>
        Requires Base Sepolia gas plus a small Base Sepolia USDC balance for the live x402 payment.
      </p>
      <div className="cta-row" style={{ marginTop: 12 }}>
        <button className="button secondary" onClick={handlePurchase} type="button">Buy venue hint</button>
      </div>
      <div className="status-banner" style={{ marginTop: 14 }}>{status}</div>
      {lastHint ? (
        <div className="summary-grid" style={{ marginTop: 12 }}>
          <div className="summary-tile">
            <span className="eyebrow">Latest signal</span>
            <strong>{lastHint}</strong>
          </div>
          <div className="summary-tile">
            <span className="eyebrow">Receipt</span>
            <strong>{txHash ?? "pending"}</strong>
          </div>
        </div>
      ) : null}
    </section>
  );
}
