export type QueueStageKey = "scout" | "arrival" | "heartbeat" | "completion";
export type QueueJobStatus = "draft" | "posted" | "accepted" | "holding" | "completed" | "expired";
export type PlannerAction = "scout-only" | "scout-then-hold" | "abort";

export interface QueueStageView {
  key: QueueStageKey;
  label: string;
  amount: string;
  released: boolean;
  proofHash: string;
  timestamp: string;
}

export interface DelegationPolicyView {
  mode: "mock-bounded-policy" | "metamask-delegation";
  spendCap: string;
  expiry: string;
  approvedToken: string;
  approvedContract: string;
  jobId: string;
  notes: string[];
}

export interface RunnerVerificationView {
  status: "verified" | "pending" | "blocked";
  provider: "self" | "mock-self";
  reference: string;
}

export interface QueueJobView {
  id: string;
  title: string;
  coarseArea: string;
  exactLocationHint?: string;
  status: QueueJobStatus;
  maxSpend: string;
  delegationSummary: string;
  runnerVerified: boolean;
  runnerVerification: RunnerVerificationView;
  currentStage: string;
  keptPrivate: string[];
  payoutSummary: string;
  stages: QueueStageView[];
  policy: DelegationPolicyView;
}

export interface RunnerCandidate {
  address: string;
  score: number;
  verifiedHuman: boolean;
  etaMinutes: number;
}

export interface PlannerInput {
  urgency: "low" | "medium" | "high";
  scoutFee: number;
  completionBonus: number;
  maxBudget: number;
  hiddenExactLocation: string;
  hiddenNotes?: string;
  candidates: RunnerCandidate[];
}

export interface PlannerDecision {
  action: PlannerAction;
  reason: string;
  chosenRunner?: RunnerCandidate;
}

export interface PublicPlannerSummary {
  action: PlannerAction;
  reason: string;
  selectedRunnerAddress?: string;
}

export interface SelfVerificationResult {
  status: "verified" | "blocked";
  reference: string;
  provider: "self" | "mock-self";
}

export function buildPlannerDecision(input: PlannerInput): PlannerDecision {
  const sorted = [...input.candidates].sort((a, b) => {
    const verifiedDelta = Number(b.verifiedHuman) - Number(a.verifiedHuman);
    if (verifiedDelta !== 0) return verifiedDelta;
    return a.etaMinutes - b.etaMinutes;
  });

  const chosenRunner = sorted[0];

  if (!chosenRunner || !chosenRunner.verifiedHuman) {
    return {
      action: "abort",
      reason: "No verified runner candidate met the minimum trust bar."
    };
  }

  if (input.maxBudget < input.scoutFee + input.completionBonus) {
    return {
      action: "abort",
      reason: "Buyer budget does not safely cover the requested staged payout plan."
    };
  }

  if (input.urgency === "high" || input.completionBonus >= input.scoutFee * 4) {
    return {
      action: "scout-then-hold",
      reason: "Urgency or completion upside justifies immediate hold after a positive scout signal.",
      chosenRunner
    };
  }

  return {
    action: "scout-only",
    reason: "Default to low-risk scouting first when urgency and payoff are moderate.",
    chosenRunner
  };
}

export function toPublicPlannerSummary(decision: PlannerDecision): PublicPlannerSummary {
  return {
    action: decision.action,
    reason: decision.reason,
    selectedRunnerAddress: decision.chosenRunner?.address
  };
}

export const queueKeeperEscrowAbi = [] as const;


export const deployedAddresses = {
  escrow: "0xb566298bf1c1afa55f0edc514b2f9d990c82f98c",
  policy: "0x8a1e766156d1107b99546c8d84f57f9dffd9bcb3",
  proofRegistry: "0xc049de0d689bdf0186407a03708204c9e4199e49"
} as const;
