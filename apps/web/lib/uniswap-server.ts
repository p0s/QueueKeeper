import {
  createPublicClient,
  encodeFunctionData,
  erc20Abi,
  http,
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
    cache: "no-store"
  });

  const json = (await response.json()) as T & { error?: string; detail?: string; message?: string };
  if (!response.ok) {
    throw new Error(json.detail ?? json.message ?? json.error ?? `Uniswap request failed: ${response.status}`);
  }
  return json;
}

export async function requestUniswapApproval(input: UniswapCheckApprovalRequest): Promise<UniswapCheckApprovalResponse> {
  const chainId = input.chainId ?? 11155111;
  if (chainId !== 11155111) {
    throw new Error("QueueKeeper Uniswap normalization currently supports Ethereum Sepolia only.");
  }

  const publicClient = getSepoliaClient();
  const allowance = await publicClient.readContract({
    address: input.token as Address,
    abi: erc20Abi,
    functionName: "allowance",
    args: [input.walletAddress as Address, permit2Address]
  });

  if (allowance >= BigInt(input.amount)) {
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
      to: input.token,
      from: input.walletAddress,
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
  return postUniswap<UniswapQuoteResponse>("/quote", {
    type: "EXACT_INPUT",
    tokenInChainId: input.tokenInChainId ?? 11155111,
    tokenOutChainId: input.tokenOutChainId ?? 11155111,
    generatePermitAsTransaction: false,
    autoSlippage: "DEFAULT",
    routingPreference: "BEST_PRICE",
    spreadOptimization: "EXECUTION",
    urgency: "normal",
    permitAmount: "FULL",
    amount: input.amount,
    tokenIn: input.tokenIn,
    tokenOut: input.tokenOut,
    swapper: input.swapper
  });
}

export async function requestUniswapSwap(input: UniswapSwapRequest): Promise<UniswapSwapResponse> {
  return postUniswap<UniswapSwapResponse>("/swap", {
    quote: input.quote,
    signature: input.signature,
    permitData: input.permitData ?? undefined
  });
}
