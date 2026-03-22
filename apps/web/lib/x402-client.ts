"use client";

import { decodePaymentResponseHeader, wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { toClientEvmSigner } from "@x402/evm";
import type { PaidVenueHintResponse } from "@queuekeeper/shared";
import { BASE_SEPOLIA_CHAIN_ID, getBrowserWalletClients, signBrowserTypedData } from "./chain-client";

type PaidVenueHintPurchaseResult = {
  hint: PaidVenueHintResponse;
  payment: {
    payer?: string;
    transaction: string;
    network: string;
  };
};

export async function buyPaidVenueHint(taskId?: string): Promise<PaidVenueHintPurchaseResult> {
  const { account, publicClient } = await getBrowserWalletClients(BASE_SEPOLIA_CHAIN_ID);
  const client = new x402Client();

  registerExactEvmScheme(client, {
    signer: toClientEvmSigner({
      address: account,
      signTypedData: async (message) => (await signBrowserTypedData(BASE_SEPOLIA_CHAIN_ID, {
        domain: message.domain as Record<string, unknown>,
        types: message.types as Record<string, Array<{ name: string; type: string }>>,
        values: message.message as Record<string, unknown>
      })) as `0x${string}`
    }, publicClient as never),
    networks: ["eip155:84532"]
  });

  const paidFetch = wrapFetchWithPayment(window.fetch.bind(window), client);
  const query = taskId ? `?taskId=${encodeURIComponent(taskId)}` : "";
  const response = await paidFetch(`/api/v1/x402/venue-hint${query}`, {
    method: "GET",
    headers: {
      accept: "application/json"
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `x402 request failed: ${response.status}`);
  }

  const paymentHeader = response.headers.get("PAYMENT-RESPONSE") ?? response.headers.get("X-PAYMENT-RESPONSE");
  if (!paymentHeader) {
    throw new Error("x402 payment response header missing.");
  }

  const payment = decodePaymentResponseHeader(paymentHeader);
  const hint = (await response.json()) as PaidVenueHintResponse;

  return {
    hint,
    payment: {
      payer: payment.payer,
      transaction: payment.transaction,
      network: payment.network
    }
  };
}
