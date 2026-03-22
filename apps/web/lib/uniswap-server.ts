import {
  createPublicClient,
  encodeFunctionData,
  erc20Abi,
  http,
  isAddress,
  maxUint256,
  type Address
} from "viem";
import { sepolia } from "viem/chains";
import type {
  UniswapCheckApprovalRequest,
  UniswapCheckApprovalResponse,
  UniswapQuoteRequest,
  UniswapQuoteResponse,
  UniswapSwapRequest,
  UniswapSwapResponse
} from "@queuekeeper/shared";

const uniswapApiBase = "https://trade-api.gateway.uniswap.org/v1";
const permit2Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3" as Address;
const ethereumSepoliaChainId = 11155111;

function requireAddress(value: string, label: string) {
  if (!isAddress(value)) {
    throw new Error(`${label} must be a valid EVM address.`);
  }
  return value as Address;
}

function requirePositiveIntegerString(value: string, label: string) {
  if (!/^[0-9]+$/.test(value) || value === "0") {
    throw new Error(`${label} must be a positive integer string.`);
  }
  if (value.length > 80) {
    throw new Error(`${label} is too large.`);
  }
  return value;
}

function requireSepoliaChainId(chainId: number, label: string) {
  if (chainId !== ethereumSepoliaChainId) {
    throw new Error(`${label} currently supports Ethereum Sepolia only.`);
  }
  return chainId;
}

function requireHexString(value: string, label: string) {
  if (!/^0x[0-9a-fA-F]+$/.test(value)) {
    throw new Error(`${label} must be a hex string.`);
  }
  return value;
}

function getUniswapApiKey() {
  const apiKey = process.env.UNISWAP_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("UNISWAP_API_KEY is not configured.");
  }
  return apiKey;
}

function getSepoliaClient() {
  return createPublicClient({
    chain: sepolia,
    transport: http(process.env.NEXT_PUBLIC_ETHEREUM_SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com")
  });
}

async function postUniswap<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${uniswapApiBase}${path}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-api-key": getUniswapApiKey(),
      "x-universal-router-version": "2.0"
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000)
  });

  const json = (await response.json()) as T & { error?: string; detail?: string; message?: string };
  if (!response.ok) {
    throw new Error(json.detail ?? json.message ?? json.error ?? `Uniswap request failed: ${response.status}`);
  }
  return json;
}

export async function requestUniswapApproval(input: UniswapCheckApprovalRequest): Promise<UniswapCheckApprovalResponse> {
  const chainId = requireSepoliaChainId(input.chainId ?? ethereumSepoliaChainId, "chainId");
  const token = requireAddress(input.token, "token");
  const walletAddress = requireAddress(input.walletAddress, "walletAddress");
  const amount = requirePositiveIntegerString(input.amount, "amount");

  const publicClient = getSepoliaClient();
  const allowance = await publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "allowance",
    args: [walletAddress, permit2Address]
  });

  if (allowance >= BigInt(amount)) {
    return {
      approval: null,
      cancel: null,
      gasFee: null,
      requestId: null
    };
  }

  return {
    requestId: null,
    gasFee: null,
    cancel: null,
    approval: {
      to: token,
      from: walletAddress,
      value: "0",
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [permit2Address, maxUint256]
      }),
      chainId
    }
  };
}

export async function requestUniswapQuote(input: UniswapQuoteRequest): Promise<UniswapQuoteResponse> {
  const tokenInChainId = requireSepoliaChainId(input.tokenInChainId ?? ethereumSepoliaChainId, "tokenInChainId");
  const tokenOutChainId = requireSepoliaChainId(input.tokenOutChainId ?? ethereumSepoliaChainId, "tokenOutChainId");
  return postUniswap<UniswapQuoteResponse>("/quote", {
    type: "EXACT_INPUT",
    tokenInChainId,
    tokenOutChainId,
    generatePermitAsTransaction: false,
    autoSlippage: "DEFAULT",
    routingPreference: "BEST_PRICE",
    spreadOptimization: "EXECUTION",
    urgency: "normal",
    permitAmount: "FULL",
    amount: requirePositiveIntegerString(input.amount, "amount"),
    tokenIn: requireAddress(input.tokenIn, "tokenIn"),
    tokenOut: requireAddress(input.tokenOut, "tokenOut"),
    swapper: requireAddress(input.swapper, "swapper")
  });
}

export async function requestUniswapSwap(input: UniswapSwapRequest): Promise<UniswapSwapResponse> {
  requireSepoliaChainId(input.quote.chainId, "quote.chainId");
  requireAddress(input.quote.swapper, "quote.swapper");
  requireAddress(input.quote.input.token, "quote.input.token");
  requireAddress(input.quote.output.token, "quote.output.token");
  requirePositiveIntegerString(input.quote.input.amount, "quote.input.amount");
  requirePositiveIntegerString(input.quote.output.amount, "quote.output.amount");
  requireHexString(input.signature, "signature");

  return postUniswap<UniswapSwapResponse>("/swap", {
    quote: input.quote,
    signature: input.signature,
    permitData: input.permitData ?? undefined
  });
}
