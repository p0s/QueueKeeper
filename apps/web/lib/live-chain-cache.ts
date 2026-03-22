"use client";

type LiveChainCache = {
  onchainJobId?: string;
  txHashes?: Record<string, string>;
};

const storagePrefix = "queuekeeper-live-chain:";

function getStorageKey(jobId: string) {
  return `${storagePrefix}${jobId}`;
}

function readCache(jobId: string): LiveChainCache {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(getStorageKey(jobId));
  if (!raw) return {};

  try {
    return JSON.parse(raw) as LiveChainCache;
  } catch {
    return {};
  }
}

function writeCache(jobId: string, value: LiveChainCache) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getStorageKey(jobId), JSON.stringify(value));
}

export function getCachedOnchainJobId(jobId: string): string | null {
  return readCache(jobId).onchainJobId ?? null;
}

export function setCachedOnchainJobId(jobId: string, onchainJobId: string) {
  const current = readCache(jobId);
  writeCache(jobId, { ...current, onchainJobId });
}

export function getCachedTxHashes(jobId: string): Record<string, string> {
  return readCache(jobId).txHashes ?? {};
}

export function rememberTxHash(jobId: string, key: string, txHash: string) {
  const current = readCache(jobId);
  writeCache(jobId, {
    ...current,
    txHashes: {
      ...(current.txHashes ?? {}),
      [key]: txHash
    }
  });
}
