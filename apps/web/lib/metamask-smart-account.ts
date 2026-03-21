"use client";

import { createWalletClient, custom } from "viem";

type BrowserEthereum = {
  request?: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
};

export type QueueKeeperPermissionRequest = {
  chainId: number;
  expiry: number;
  tokenAddress: `0x${string}`;
  contractAddress: `0x${string}`;
  spendCap: bigint;
  justification: string;
};

export async function requestQueueKeeperAdvancedPermissions(request: QueueKeeperPermissionRequest) {
  if (typeof window === "undefined") {
    throw new Error("window unavailable");
  }

  const ethereum = (window as Window & { ethereum?: BrowserEthereum }).ethereum;
  if (!ethereum) {
    throw new Error("MetaMask not detected");
  }

  const { erc7715ProviderActions } = await import("@metamask/smart-accounts-kit/actions");

  const walletClient = createWalletClient({
    transport: custom(ethereum as never)
  }).extend(erc7715ProviderActions());

  // This follows MetaMask's ERC-7715 / Smart Accounts Kit shape conceptually:
  // - request human-readable advanced permissions through wallet_grantPermissions
  // - bind the permission to a signer/session identity
  // - constrain token + amount + period / expiry
  // For QueueKeeper's MVP we request an ERC-20 periodic permission matching the
  // same bounded policy surface shown in the UI.
  const currentTime = Math.floor(Date.now() / 1000);
  const expiry = Math.max(request.expiry, currentTime + 3600);

  const grantedPermissions = await (walletClient as unknown as {
    requestExecutionPermissions: (permissions: unknown[]) => Promise<unknown>;
  }).requestExecutionPermissions([
    {
      chainId: request.chainId,
      expiry,
      signer: {
        type: "account",
        data: {
          address: request.contractAddress
        }
      },
      permission: {
        type: "erc20-token-periodic",
        data: {
          tokenAddress: request.tokenAddress,
          periodAmount: request.spendCap,
          periodDuration: 86400,
          justification: request.justification
        }
      },
      isAdjustmentAllowed: true
    }
  ]);

  return grantedPermissions;
}
