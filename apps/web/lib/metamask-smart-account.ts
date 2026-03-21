"use client";

import { createPublicClient, createWalletClient, custom, http } from "viem";
import { createBundlerClient } from "viem/account-abstraction";
import type { Hex } from "viem";

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
  if (typeof window === "undefined") throw new Error("window unavailable");
  const ethereum = (window as Window & { ethereum?: BrowserEthereum }).ethereum;
  if (!ethereum) throw new Error("MetaMask not detected");

  const { erc7715ProviderActions } = await import("@metamask/smart-accounts-kit/actions");

  const walletClient = createWalletClient({
    transport: custom(ethereum as never)
  }).extend(erc7715ProviderActions());

  const currentTime = Math.floor(Date.now() / 1000);
  const expiry = Math.max(request.expiry, currentTime + 3600);

  return await (walletClient as unknown as {
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
}

export async function bootstrapMetaMaskSmartAccount(chainId: number) {
  if (typeof window === "undefined") throw new Error("window unavailable");
  const ethereum = (window as Window & { ethereum?: BrowserEthereum }).ethereum;
  if (!ethereum) throw new Error("MetaMask not detected");

  const { toMetaMaskSmartAccount, Implementation } = await import("@metamask/smart-accounts-kit");

  const walletClient = createWalletClient({
    transport: custom(ethereum as never)
  });

  const addresses = (await (walletClient as unknown as { getAddresses: () => Promise<Hex[]> }).getAddresses?.())
    ?? ((await ethereum.request?.({ method: "eth_requestAccounts" })) as Hex[]);
  const owner = addresses?.[0];
  if (!owner) throw new Error("No wallet account found");

  const rpcUrl = process.env.NEXT_PUBLIC_CELO_RPC_URL ?? "https://forno.celo-sepolia.celo-testnet.org";
  const bundlerUrl = process.env.NEXT_PUBLIC_BUNDLER_RPC_URL ?? rpcUrl;

  const publicClient = createPublicClient({
    transport: http(rpcUrl)
  });

  const smartAccount = await toMetaMaskSmartAccount({
    client: publicClient,
    implementation: Implementation.Hybrid,
    deployParams: [owner, [], [], []],
    deploySalt: "0x",
    signer: { walletClient: walletClient as never }
  });

  const bundlerClient = createBundlerClient({
    client: publicClient,
    transport: http(bundlerUrl)
  });

  return {
    owner,
    chainId,
    smartAccountAddress: smartAccount.address,
    bundlerReady: Boolean(bundlerClient)
  };
}
