"use client";

import { useEffect, useState } from "react";
import { createPublicClient, getAddress, http, isAddress, type Address } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";

type EnsResolution = {
  address: Address | null;
  ensName: string | null;
  error: string | null;
};

const defaultEnsRpcUrl = process.env.NEXT_PUBLIC_ENS_RPC_URL ?? "https://eth.merkle.io";
const ensClient = createPublicClient({
  chain: mainnet,
  transport: http(defaultEnsRpcUrl)
});

const ensInputCache = new Map<string, Promise<EnsResolution>>();

export function isEnsInput(value: string | null | undefined) {
  return Boolean(value?.trim().toLowerCase().endsWith(".eth"));
}

async function lookupEnsResolution(rawValue: string): Promise<EnsResolution> {
  const value = rawValue.trim();
  if (!value) {
    return { address: null, ensName: null, error: null };
  }

  try {
    if (isAddress(value, { strict: false })) {
      const ensName = await ensClient.getEnsName({ address: value as Address });
      return {
        address: getAddress(value),
        ensName: ensName ?? null,
        error: null
      };
    }

    if (isEnsInput(value)) {
      const name = normalize(value);
      const address = await ensClient.getEnsAddress({ name });
      return {
        address: address ?? null,
        ensName: name,
        error: address ? null : "ENS name did not resolve to an address."
      };
    }
  } catch (error) {
    return {
      address: null,
      ensName: null,
      error: error instanceof Error ? error.message : "ENS lookup failed."
    };
  }

  return {
    address: null,
    ensName: null,
    error: "Enter a valid EVM address or .eth name."
  };
}

export async function resolveAddressOrEns(value: string | null | undefined): Promise<EnsResolution> {
  const normalized = value?.trim() ?? "";
  if (!normalized) {
    return { address: null, ensName: null, error: null };
  }
  const existing = ensInputCache.get(normalized);
  if (existing) {
    return existing;
  }
  const request = lookupEnsResolution(normalized);
  ensInputCache.set(normalized, request);
  return request;
}

export function useEnsIdentity(value: string | null | undefined) {
  const [state, setState] = useState<EnsResolution>({
    address: null,
    ensName: null,
    error: null
  });

  useEffect(() => {
    let active = true;
    void resolveAddressOrEns(value).then((next) => {
      if (active) {
        setState(next);
      }
    });
    return () => {
      active = false;
    };
  }, [value]);

  return state;
}
