"use client";

const buyerTokenPrefix = "queuekeeper:buyer-token:";
const runnerRevealTokenPrefix = "queuekeeper:runner-reveal-token:";

export function getBuyerToken(jobId: string) {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(`${buyerTokenPrefix}${jobId}`);
}

export function setBuyerToken(jobId: string, token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${buyerTokenPrefix}${jobId}`, token);
}

export function getRunnerRevealToken(jobId: string) {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(`${runnerRevealTokenPrefix}${jobId}`);
}

export function setRunnerRevealToken(jobId: string, token: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(`${runnerRevealTokenPrefix}${jobId}`, token);
}
