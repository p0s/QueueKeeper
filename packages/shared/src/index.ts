export type QueueStageKey = "scout" | "arrival" | "heartbeat" | "completion";
export type QueueJobStatus = "draft" | "posted" | "accepted" | "holding" | "completed" | "expired";
export type PlannerAction = "scout-only" | "scout-then-hold" | "abort";
export type QueueViewerRole = "public" | "buyer" | "runner";
export type DelegationPolicyMode = "mock-bounded-policy" | "metamask-delegation";
export type DelegationPolicyStatus = "not-requested" | "requested" | "granted" | "rejected" | "mock-fallback";
export type QueueStageStatus = "pending-proof" | "awaiting-release" | "released";

export const queueStageOrder: QueueStageKey[] = ["scout", "arrival", "heartbeat", "completion"];

export const queueStageLabels: Record<QueueStageKey, string> = {
  scout: "Scout",
  arrival: "Arrival",
  heartbeat: "Heartbeat",
  completion: "Completion"
};

export interface QueueStageView {
  key: QueueStageKey;
  label: string;
  amount: string;
  released: boolean;
  status: QueueStageStatus;
  proofHash: string;
  proofSubmittedAt: string | null;
  releasedAt: string | null;
  timestamp: string;
  proofTxHash?: string | null;
  releaseTxHash?: string | null;
}

export interface DelegationPolicyView {
  mode: DelegationPolicyMode;
  status: DelegationPolicyStatus;
  spendCap: string;
  expiry: string;
  approvedToken: string;
  approvedContract: string;
  jobId: string;
  notes: string[];
  lastResult: string;
  lastUpdatedAt: string | null;
  requestor: string | null;
}

export interface RunnerVerificationView {
  status: "verified" | "pending" | "blocked";
  provider: "self" | "mock-self";
  reference: string;
  verifiedAt: string | null;
}

export interface ExplorerLinkView {
  label: string;
  href: string;
  kind: "contract" | "tx";
}

export interface QueueJobView {
  id: string;
  title: string;
  coarseArea: string;
  exactLocationHint?: string;
  exactLocationVisibleToViewer?: string | null;
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
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  selectedRunnerAddress?: string;
  acceptedRunnerAddress?: string;
  onchainJobId?: string | null;
  plannerPreview?: PublicPlannerSummary;
  explorerLinks: ExplorerLinkView[];
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
  reason?: string;
}

export interface BuyerJobFormInput {
  id?: string;
  title: string;
  coarseArea: string;
  exactLocation: string;
  hiddenNotes: string;
  maxSpendUsd: number;
  scoutFeeUsd: number;
  arrivalFeeUsd: number;
  heartbeatFeeUsd: number;
  completionFeeUsd: number;
  expiresInMinutes: number;
  buyerAddress?: string;
  selectedRunnerAddress?: string;
  plannerPreview?: PublicPlannerSummary;
}

export interface SubmitProofRequest {
  stageKey: QueueStageKey;
  proofHash: string;
  submitterAddress?: string;
  encryptedUri?: string;
  txHash?: string;
}

export interface ReleaseStageRequest {
  stageKey: QueueStageKey;
  buyerAddress?: string;
  txHash?: string;
}

export interface DelegationUpdateRequest {
  mode: DelegationPolicyMode;
  status: DelegationPolicyStatus;
  requestor?: string | null;
  result: string;
}

export interface AcceptJobVerificationPayload {
  reference?: string;
  mockVerified?: boolean;
  proof?: unknown;
  publicSignals?: string[] | string;
  attestationId?: number | string;
  userContextData?: string;
  signal?: string;
}

export interface AcceptJobRequest {
  jobId: string;
  runnerAddress: string;
  verificationPayload: AcceptJobVerificationPayload;
  txHash?: string;
}

export interface AcceptJobResponse {
  accepted: true;
  jobId: string;
  runnerAddress: string;
  job: QueueJobView;
  acceptanceRecord: {
    verificationReference: string;
    verificationProvider: string;
    exactLocationRevealAllowed: boolean;
    revealToken: string;
  };
  exactLocation: string;
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

export { deployedAddresses } from "./generated/addresses";
export { queueKeeperEscrowAbi } from "./generated/queuekeeperEscrowAbi";
