import {
  buildPlannerDecision,
  deployedAddresses,
  toPublicPlannerSummary,
  type BuyerJobFormInput,
  type PlannerInput,
  type PublicPlannerSummary,
  type RunnerCandidate
} from "@queuekeeper/shared";
import { getAddress } from "viem";

export const demoRunnerCandidates: RunnerCandidate[] = [
  {
    address: getAddress("0xa11ce00000000000000000000000000000000001"),
    score: 92,
    verifiedHuman: true,
    etaMinutes: 6
  },
  {
    address: getAddress("0xb0b0000000000000000000000000000000000002"),
    score: 81,
    verifiedHuman: false,
    etaMinutes: 4
  }
];

export function getDefaultTokenAddress(): `0x${string}` {
  return (process.env.NEXT_PUBLIC_QUEUEKEEPER_TOKEN_ADDRESS
    ?? "0xEeA30fA689535f7FB45a8A91045E3b1d1c54A3d6") as `0x${string}`;
}

export function getDefaultEscrowAddress(): `0x${string}` {
  return (process.env.NEXT_PUBLIC_QUEUEKEEPER_ESCROW_ADDRESS
    ?? deployedAddresses.escrow) as `0x${string}`;
}

export function getDefaultBuyerFormInput(): BuyerJobFormInput {
  return {
    mode: "DIRECT_DISPATCH",
    title: "Conference merch queue hold",
    coarseArea: "Moscone West / Howard St",
    timingWindow: "Today, next 2 hours",
    exactLocation: "North entrance merch line, next to the red sponsor arch",
    hiddenNotes: "Scout first. Hold only if the line is moving and still below the corner.",
    privateFallbackInstructions: "Abort if staff switches to wristband-only entry.",
    sensitiveBuyerPreferences: "Buyer mostly wants queue intelligence and a place hold, not item purchase.",
    handoffSecret: "MERCH-2026-HANDOFF",
    waitingToleranceMinutes: 10,
    maxSpendUsd: 35,
    scoutFeeUsd: 4,
    arrivalFeeUsd: 6,
    heartbeatFeeUsd: 5,
    completionFeeUsd: 20,
    expiresInMinutes: 120,
    heartbeatCount: 3,
    heartbeatIntervalSeconds: 300,
    buyerAddress: getAddress("0xb0b0000000000000000000000000000000000001"),
    selectedRunnerAddress: demoRunnerCandidates[0].address
  };
}

export function buildPlannerInputFromBuyerForm(form: BuyerJobFormInput): PlannerInput {
  return {
    urgency: form.expiresInMinutes <= 45 ? "high" : form.expiresInMinutes <= 120 ? "medium" : "low",
    scoutFee: form.scoutFeeUsd,
    arrivalFee: form.arrivalFeeUsd,
    heartbeatFee: form.heartbeatFeeUsd,
    completionBonus: form.completionFeeUsd,
    maxBudget: form.maxSpendUsd,
    hiddenExactLocation: form.exactLocation,
    hiddenNotes: form.hiddenNotes,
    privateFallbackInstructions: form.privateFallbackInstructions,
    waitingToleranceMinutes: form.waitingToleranceMinutes,
    mode: form.mode,
    candidates: demoRunnerCandidates
  };
}

export function derivePlannerPreview(form: BuyerJobFormInput): PublicPlannerSummary {
  return toPublicPlannerSummary(buildPlannerDecision(buildPlannerInputFromBuyerForm(form)));
}
