"use client";

import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  http,
  keccak256,
  parseEther,
  parseUnits,
  stringToHex,
  type Address,
  type Chain,
  type Hex
} from "viem";
import { baseSepolia, sepolia } from "viem/chains";
import {
  queueKeeperEscrowAbi,
  type UniswapPreparedApproval,
  type UniswapPreparedSwap,
  type BuyerJobFormInput,
  type QueueStageKey
} from "@queuekeeper/shared";
import { getDefaultEscrowAddress, getDefaultTokenAddress } from "./demo-data";

type BrowserEthereum = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
};

type BrowserWalletClients = {
  account: Address;
  walletClient: ReturnType<typeof createWalletClient>;
  publicClient: ReturnType<typeof createPublicClient>;
};

type ChainConfig = {
  chainId: number;
  name: string;
  chain: Chain;
  rpcUrl: string;
};

const proofStageIndex: Record<QueueStageKey, number> = {
  scout: 1,
  arrival: 2,
  heartbeat: 3,
  completion: 4
};

const wethAbi = [
  {
    type: "function",
    name: "deposit",
    stateMutability: "payable",
    inputs: [],
    outputs: []
  }
] as const;

export const ETHEREUM_SEPOLIA_CHAIN_ID = 11155111;
export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const WETH_SEPOLIA_ADDRESS = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14" as Address;
export const USDC_SEPOLIA_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as Address;

const celoSepoliaChain = defineChain({
  id: 11142220,
  name: "Celo Sepolia",
  nativeCurrency: {
    name: "CELO",
    symbol: "CELO",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: ["https://forno.celo-sepolia.celo-testnet.org"]
    }
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://celo-sepolia.blockscout.com"
    }
  }
});

const chainConfigs: Record<number, ChainConfig> = {
  [ETHEREUM_SEPOLIA_CHAIN_ID]: {
    chainId: ETHEREUM_SEPOLIA_CHAIN_ID,
    name: "Ethereum Sepolia",
    chain: sepolia,
    rpcUrl: process.env.NEXT_PUBLIC_ETHEREUM_SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com"
  },
  [BASE_SEPOLIA_CHAIN_ID]: {
    chainId: BASE_SEPOLIA_CHAIN_ID,
    name: "Base Sepolia",
    chain: baseSepolia,
    rpcUrl: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org"
  },
  11142220: {
    chainId: 11142220,
    name: "Celo Sepolia",
    chain: celoSepoliaChain,
    rpcUrl: process.env.NEXT_PUBLIC_CELO_RPC_URL ?? "https://forno.celo-sepolia.celo-testnet.org"
  }
};

function getEthereum(): BrowserEthereum {
  if (typeof window === "undefined") {
    throw new Error("Live chain writes require a browser wallet.");
  }

  const ethereum = (window as Window & { ethereum?: BrowserEthereum }).ethereum;
  if (!ethereum?.request) {
    throw new Error("MetaMask not detected.");
  }

  return ethereum;
}

function getChainConfig(chainId: number): ChainConfig {
  const config = chainConfigs[chainId];
  if (!config) {
    throw new Error(`Unsupported chain ${chainId}.`);
  }
  return config;
}

async function ensureBrowserChain(chainId: number) {
  const ethereum = getEthereum();
  const config = getChainConfig(chainId);
  const chainHex = `0x${chainId.toString(16)}`;

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainHex }]
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("4902") && !message.toLowerCase().includes("unrecognized chain")) {
      throw error;
    }

    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: chainHex,
        chainName: config.name,
        nativeCurrency: {
          name: config.chain.nativeCurrency.name,
          symbol: config.chain.nativeCurrency.symbol,
          decimals: config.chain.nativeCurrency.decimals
        },
        rpcUrls: [config.rpcUrl],
        blockExplorerUrls: config.chain.blockExplorers?.default?.url ? [config.chain.blockExplorers.default.url] : []
      }]
    });
  }
}

async function getWalletClients(chainId = 11142220): Promise<BrowserWalletClients> {
  const ethereum = getEthereum();
  const config = getChainConfig(chainId);
  await ensureBrowserChain(chainId);
  const walletClient = createWalletClient({
    chain: config.chain,
    transport: custom(ethereum as never)
  });

  const addresses = ((await ethereum.request({
    method: "eth_requestAccounts"
  })) as Address[]) ?? [];
  const account = addresses[0];

  if (!account) {
    throw new Error("No wallet account returned.");
  }

  const publicClient = createPublicClient({
    chain: config.chain,
    transport: http(config.rpcUrl)
  });

  return { account, walletClient, publicClient };
}

export async function getBrowserWalletClients(chainId: number) {
  return getWalletClients(chainId);
}

export async function createLiveJob(form: BuyerJobFormInput, selectedRunnerAddress?: string) {
  const { account, walletClient, publicClient } = await getWalletClients();
  const escrowAddress = getDefaultEscrowAddress();
  const tokenAddress = getDefaultTokenAddress();
  const runnerAddress = (selectedRunnerAddress ?? form.selectedRunnerAddress) as Address | undefined;

  if (!runnerAddress) {
    throw new Error("No runner address available for the live createJob call.");
  }

  const nextJobId = await publicClient.readContract({
    address: escrowAddress,
    abi: queueKeeperEscrowAbi,
    functionName: "nextJobId"
  });

  const detailsHash = keccak256(
    stringToHex(JSON.stringify({
      exactLocation: form.exactLocation,
      hiddenNotes: form.hiddenNotes,
      coarseArea: form.coarseArea
    }))
  );

  const txHash = await walletClient.writeContract({
    account,
    chain: undefined,
    address: escrowAddress,
    abi: queueKeeperEscrowAbi,
    functionName: "createJob",
    args: [
      {
        token: tokenAddress,
        runner: runnerAddress,
        scoutFee: parseUnits(String(form.scoutFeeUsd), 18),
        arrivalFee: parseUnits(String(form.arrivalFeeUsd), 18),
        heartbeatFee: parseUnits(String(form.heartbeatFeeUsd), 18),
        completionFee: parseUnits(String(form.completionFeeUsd), 18),
        heartbeatCount: form.heartbeatCount ?? 1,
        lowRiskAutoReleaseWindow: form.heartbeatIntervalSeconds ?? 300,
        disputeWindow: 1800,
        expiry: BigInt(Math.floor(Date.now() / 1000) + form.expiresInMinutes * 60),
        detailsHash,
        arbiter: (process.env.NEXT_PUBLIC_QUEUEKEEPER_ARBITER_ADDRESS ?? account) as Address
      }
    ]
  });

  return {
    txHash,
    onchainJobId: nextJobId.toString()
  };
}

export async function acceptLiveJob(onchainJobId: string, verificationReference: string) {
  const { account, walletClient } = await getWalletClients();

  const txHash = await walletClient.writeContract({
    account,
    chain: undefined,
    address: getDefaultEscrowAddress(),
    abi: queueKeeperEscrowAbi,
    functionName: "acceptJob",
    args: [BigInt(onchainJobId), stringToHex(verificationReference) as Hex]
  });

  return { txHash };
}

export async function submitLiveProof(onchainJobId: string, stageKey: QueueStageKey, proofHash: string, sequence = 1) {
  const { account, walletClient } = await getWalletClients();
  const normalizedProofHash = proofHash.startsWith("0x")
    ? proofHash
    : keccak256(stringToHex(proofHash));
  const proofStage = stageKey === "heartbeat" ? 10 + sequence : proofStageIndex[stageKey];

  const txHash = await walletClient.writeContract({
    account,
    chain: undefined,
    address: getDefaultEscrowAddress(),
    abi: queueKeeperEscrowAbi,
    functionName: "submitProofHash",
    args: [BigInt(onchainJobId), proofStage, normalizedProofHash as Hex]
  });

  return { txHash };
}

export async function releaseLiveStage(onchainJobId: string, stageKey: QueueStageKey) {
  const { account, walletClient } = await getWalletClients();

  const functionName = stageKey === "scout"
    ? "releaseScout"
    : stageKey === "arrival"
      ? "releaseArrival"
      : stageKey === "heartbeat"
        ? "releaseHeartbeat"
        : "releaseCompletion";

  const txHash = await walletClient.writeContract({
    account,
    chain: undefined,
    address: getDefaultEscrowAddress(),
    abi: queueKeeperEscrowAbi,
    functionName,
    args: [BigInt(onchainJobId)]
  });

  return { txHash };
}

export async function connectWalletOnChain(chainId: number) {
  const { account } = await getWalletClients(chainId);
  return { account };
}

export async function wrapEthToWethSepolia(amountEth: string) {
  const { account, walletClient, publicClient } = await getWalletClients(ETHEREUM_SEPOLIA_CHAIN_ID);
  const txHash = await walletClient.writeContract({
    account,
    chain: sepolia,
    address: WETH_SEPOLIA_ADDRESS,
    abi: wethAbi,
    functionName: "deposit",
    value: parseEther(amountEth)
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return { txHash, tokenAddress: WETH_SEPOLIA_ADDRESS };
}

export async function sendPreparedApproval(approval: UniswapPreparedApproval) {
  const { account, walletClient, publicClient } = await getWalletClients(approval.chainId);
  const txHash = await walletClient.sendTransaction({
    account,
    chain: getChainConfig(approval.chainId).chain,
    to: approval.to as Address,
    data: approval.data as Hex,
    value: BigInt(approval.value),
    gas: approval.gasLimit ? BigInt(approval.gasLimit) : undefined,
    maxFeePerGas: approval.maxFeePerGas ? BigInt(approval.maxFeePerGas) : undefined,
    maxPriorityFeePerGas: approval.maxPriorityFeePerGas ? BigInt(approval.maxPriorityFeePerGas) : undefined
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return { txHash };
}

export async function signBrowserTypedData(chainId: number, permitData: {
  domain: Record<string, unknown>;
  types: Record<string, Array<{ name: string; type: string }>>;
  values: Record<string, unknown>;
}): Promise<string> {
  const ethereum = getEthereum();
  const { account } = await getWalletClients(chainId);

  return (await ethereum.request({
    method: "eth_signTypedData_v4",
    params: [
      account,
      JSON.stringify({
        domain: permitData.domain,
        types: permitData.types,
        primaryType: "PermitSingle",
        message: permitData.values
      })
    ]
  })) as string;
}

export async function sendPreparedSwap(swap: UniswapPreparedSwap) {
  const { account, walletClient, publicClient } = await getWalletClients(swap.chainId);
  const txHash = await walletClient.sendTransaction({
    account,
    chain: getChainConfig(swap.chainId).chain,
    to: swap.to as Address,
    data: swap.data as Hex,
    value: BigInt(swap.value),
    gas: swap.gasLimit ? BigInt(swap.gasLimit) : undefined,
    maxFeePerGas: swap.maxFeePerGas ? BigInt(swap.maxFeePerGas) : undefined,
    maxPriorityFeePerGas: swap.maxPriorityFeePerGas ? BigInt(swap.maxPriorityFeePerGas) : undefined
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return { txHash };
}
