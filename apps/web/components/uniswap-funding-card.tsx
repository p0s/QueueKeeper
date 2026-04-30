"use client";

import { useState } from "react";
import { parseEther } from "viem";
import type { FundingNormalizationReceiptRequest, UniswapCheckApprovalResponse, UniswapQuoteResponse } from "@queuekeeper/shared";
import {
  buildUniswapSwap,
  checkUniswapApproval,
  getUniswapQuote
} from "../lib/agent-client";
import {
  connectWalletOnChain,
  ETHEREUM_SEPOLIA_CHAIN_ID,
  sendPreparedApproval,
  sendPreparedSwap,
  signBrowserTypedData,
  USDC_SEPOLIA_ADDRESS,
  WETH_SEPOLIA_ADDRESS,
  wrapEthToWethSepolia
} from "../lib/chain-client";

type UniswapFundingCardProps = {
  onReceiptReady: (receipt: Omit<FundingNormalizationReceiptRequest, "buyerToken">) => void;
};

export function UniswapFundingCard({ onReceiptReady }: UniswapFundingCardProps) {
  const [amountEth, setAmountEth] = useState("0.01");
  const [account, setAccount] = useState<string | null>(null);
  const [status, setStatus] = useState("Optional treasury sidecar. Normalize test budget to Sepolia USDC before posting the task.");
  const [approval, setApproval] = useState<UniswapCheckApprovalResponse["approval"] | null>(null);
  const [quote, setQuote] = useState<UniswapQuoteResponse | null>(null);
  const [swapTxHash, setSwapTxHash] = useState<string | null>(null);

  async function handleConnect() {
    try {
      const connected = await connectWalletOnChain(ETHEREUM_SEPOLIA_CHAIN_ID);
      setAccount(connected.account);
      setStatus(`Connected ${connected.account} on Ethereum Sepolia.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to connect Ethereum Sepolia wallet.");
    }
  }

  async function handleWrap() {
    setStatus("Wrapping Sepolia ETH into WETH…");
    try {
      const wrapped = await wrapEthToWethSepolia(amountEth);
      setStatus(`WETH ready. Wrap tx: ${wrapped.txHash}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to wrap ETH into WETH.");
    }
  }

  async function handlePrepare() {
    try {
      if (!account) {
        await handleConnect();
      }
      const wallet = account ?? (await connectWalletOnChain(ETHEREUM_SEPOLIA_CHAIN_ID)).account;
      const amount = parseEther(amountEth).toString();
      setStatus("Checking Permit2 approval and quoting the Uniswap route…");
      const [approvalResult, quoteResult] = await Promise.all([
        checkUniswapApproval({
          walletAddress: wallet,
          amount,
          token: WETH_SEPOLIA_ADDRESS,
          chainId: ETHEREUM_SEPOLIA_CHAIN_ID
        }),
        getUniswapQuote({
          swapper: wallet,
          amount,
          tokenIn: WETH_SEPOLIA_ADDRESS,
          tokenOut: USDC_SEPOLIA_ADDRESS,
          tokenInChainId: ETHEREUM_SEPOLIA_CHAIN_ID,
          tokenOutChainId: ETHEREUM_SEPOLIA_CHAIN_ID
        })
      ]);
      setApproval(approvalResult.approval);
      setQuote(quoteResult);
      setStatus(
        approvalResult.approval
          ? `Approval required, then ${quoteResult.quote.output.amount} USDC base units are quoted.`
          : `Quote ready: ${quoteResult.quote.output.amount} USDC base units out.`
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to prepare the Uniswap route.");
    }
  }

  async function handleApprove() {
    if (!approval) return;
    setStatus("Sending Permit2 approval…");
    try {
      const approvalTx = await sendPreparedApproval(approval);
      setStatus(`Permit2 approval sent: ${approvalTx.txHash}`);
      setApproval(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to approve Permit2.");
    }
  }

  async function handleSwap() {
    if (!quote?.permitData) {
      setStatus("Uniswap permit data is required before swapping.");
      return;
    }
    try {
      setStatus("Signing Permit2 payload and building the Uniswap swap…");
      const signature = await signBrowserTypedData(ETHEREUM_SEPOLIA_CHAIN_ID, quote.permitData);
      const prepared = await buildUniswapSwap({
        quote: quote.quote,
        permitData: quote.permitData,
        signature
      });
      setStatus("Broadcasting Uniswap swap…");
      const swap = await sendPreparedSwap(prepared.swap);
      setSwapTxHash(swap.txHash);
      onReceiptReady({
        provider: "uniswap",
        network: "ethereum-sepolia",
        chainId: ETHEREUM_SEPOLIA_CHAIN_ID,
        txHash: swap.txHash,
        inputToken: quote.quote.input.token,
        outputToken: quote.quote.output.token,
        inputAmount: quote.quote.input.amount,
        outputAmount: quote.quote.output.amount,
        quoteId: quote.quote.quoteId ?? null,
        route: quote.routing ?? null
      });
      setStatus(`Swap complete: ${swap.txHash}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to complete the Uniswap swap.");
    }
  }

  return (
    <section className="card alt section-card">
      <strong>Normalize budget with Uniswap</strong>
      <p className="muted" style={{ marginTop: 8 }}>
        Optional sidecar: wrap Sepolia ETH, quote a WETH → USDC route, then record the swap receipt alongside the task.
      </p>
      <div className="field-grid" style={{ marginTop: 12 }}>
        <label className="field">
          <span>Swap amount (ETH)</span>
          <input className="input" type="number" min="0.001" step="0.001" value={amountEth} onChange={(event) => setAmountEth(event.target.value)} />
        </label>
        <div className="summary-tile">
          <span className="eyebrow">Wallet</span>
          <strong>{account ?? "Not connected"}</strong>
        </div>
        <div className="summary-tile">
          <span className="eyebrow">Target pair</span>
          <strong>WETH → USDC</strong>
        </div>
      </div>
      <div className="cta-row" style={{ marginTop: 14 }}>
        <button className="button secondary" onClick={handleConnect} type="button">Connect Sepolia wallet</button>
        <button className="button secondary" onClick={handleWrap} type="button">Wrap ETH</button>
        <button className="button secondary" onClick={handlePrepare} type="button">Get quote</button>
        {approval ? <button className="button secondary" onClick={handleApprove} type="button">Approve Permit2</button> : null}
        <button className="button" disabled={!quote || Boolean(approval)} onClick={handleSwap} type="button">Swap to USDC</button>
      </div>
      <div className="status-banner" style={{ marginTop: 14 }}>{status}</div>
      {quote ? (
        <div className="summary-grid" style={{ marginTop: 12 }}>
          <div className="summary-tile">
            <span className="eyebrow">Quoted out</span>
            <strong>{quote.quote.output.amount}</strong>
          </div>
          <div className="summary-tile">
            <span className="eyebrow">Routing</span>
            <strong>{quote.routing ?? "CLASSIC"}</strong>
          </div>
          <div className="summary-tile">
            <span className="eyebrow">Gas</span>
            <strong>{quote.quote.gasFee ?? "n/a"}</strong>
          </div>
          <div className="summary-tile">
            <span className="eyebrow">Swap tx</span>
            <strong>{swapTxHash ?? "pending"}</strong>
          </div>
        </div>
      ) : null}
    </section>
  );
}
