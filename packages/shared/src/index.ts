export type QueueStageKey = "scout" | "arrival" | "heartbeat" | "completion";
export type QueueJobStatus =
  | "draft"
  | "funded"
  | "posted"
  | "accepted"
  | "scouting"
  | "holding"
  | "disputed"
  | "completed"
  | "expired"
  | "refunded"
  | "cancelled";
export type PlannerAction = "scout-only" | "scout-then-hold" | "hold-now" | "abort";
export type QueueViewerRole = "public" | "buyer" | "runner";
export type DelegationPolicyMode = "mock-bounded-policy" | "metamask-delegation";
export type DelegationPolicyStatus = "not-requested" | "requested" | "granted" | "rejected" | "mock-fallback";
export type QueueStageStatus =
  | "pending-proof"
  | "submitted"
  | "awaiting-release"
  | "approved"
  | "auto-released"
  | "released"
  | "disputed"
  | "settled"
  | "refunded";
export type QueueJobMode = "DIRECT_DISPATCH" | "VERIFIED_POOL";
export type QueueVerificationRequirement = "SELF_VERIFIED";
export type QueueDisputeStatus = "none" | "open" | "settled";
export type PrincipalMode = "HUMAN" | "AGENT";
export type AgentDecision =
  | "abort"
  | "scout-again"
  | "escalate-to-hold"
  | "continue-hold"
  | "complete";

export const queueStageOrder: QueueStageKey[] = ["scout", "arrival", "heartbeat", "completion"];

export const queueStageLabels: Record<QueueStageKey, string> = {
  scout: "Scout",
  arrival: "Arrival",
  heartbeat: "Heartbeat",
  completion: "Completion"
};

export interface QueueStageView {
  stageId?: string;
  key: QueueStageKey;
  label: string;
  amount: string;
  released: boolean;
  status: QueueStageStatus;
  sequence?: number;
  proofHash: string;
  proofSubmittedAt: string | null;
  releasedAt: string | null;
  timestamp: string;
  reviewWindowEndsAt?: string | null;
  autoReleaseAt?: string | null;
  disputedAt?: string | null;
  disputeReason?: string | null;
  proofBundleAvailable?: boolean;
  imageCount?: number;
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
  mode?: QueueJobMode;
  principalMode?: PrincipalMode;
  title: string;
  coarseArea: string;
  timingWindow?: string;
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
  plannerProvider?: string;
  procurementThesis?: string;
  agentDecisionSummary?: string | null;
  disputeStatus?: QueueDisputeStatus;
  heartbeatIntervalSeconds?: number;
  heartbeatCount?: number;
  reviewWindowsSummary?: string;
  explorerLinks: ExplorerLinkView[];
}

export type TaskView = QueueJobView;

export interface RunnerCandidate {
  address: string;
  score: number;
  verifiedHuman: boolean;
  etaMinutes: number;
}

export interface PlannerInput {
  urgency: "low" | "medium" | "high";
  scoutFee: number;
  arrivalFee?: number;
  heartbeatFee?: number;
  completionBonus: number;
  maxBudget: number;
  hiddenExactLocation: string;
  hiddenNotes?: string;
  privateFallbackInstructions?: string;
  waitingToleranceMinutes?: number;
  mode?: QueueJobMode;
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
  mode?: QueueJobMode;
  principalMode?: PrincipalMode;
  title: string;
  coarseArea: string;
  timingWindow?: string;
  exactLocation: string;
  hiddenNotes: string;
  privateFallbackInstructions?: string;
  sensitiveBuyerPreferences?: string;
  handoffSecret?: string;
  waitingToleranceMinutes?: number;
  maxSpendUsd: number;
  scoutFeeUsd: number;
  arrivalFeeUsd: number;
  heartbeatFeeUsd: number;
  completionFeeUsd: number;
  expiresInMinutes: number;
  heartbeatCount?: number;
  heartbeatIntervalSeconds?: number;
  buyerAddress?: string;
  selectedRunnerAddress?: string;
  plannerPreview?: PublicPlannerSummary;
}

export interface SubmitProofRequest {
  stageKey: QueueStageKey;
  stageId?: string;
  proofHash: string;
  note?: string;
  sequence?: number;
  buyerVisibleSummary?: string;
  media?: ProofMediaInput[];
  submitterAddress?: string;
  encryptedUri?: string;
  txHash?: string;
}

export interface ReleaseStageRequest {
  stageKey: QueueStageKey;
  stageId?: string;
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
  sessionId?: string;
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

export interface ProofMediaInput {
  filename: string;
  mimeType: string;
  base64: string;
}

export interface QueueSecretPayload {
  exactLocation: string;
  hiddenNotes: string;
  privateFallbackInstructions?: string;
  sensitiveBuyerPreferences?: string;
  handoffSecret?: string;
}

export interface QueueStageRuleInput {
  key: QueueStageKey;
  amountCusd: number;
  reviewWindowSeconds: number;
  autoReleaseSeconds: number;
  disputeWindowSeconds: number;
  count?: number;
}

export interface CreateJobDraftRequest extends BuyerJobFormInput {
  verificationRequirement?: QueueVerificationRequirement;
}

export interface CreateJobDraftResponse {
  job: QueueJobView;
  buyerToken: string;
}

export interface PostJobRequest {
  jobId: string;
  buyerToken: string;
  delegation?: DelegationUpdateRequest;
  onchainJobId?: string | null;
  txHash?: string | null;
}

export interface DispatchJobRequest {
  buyerToken: string;
  runnerAddress: string;
}

export interface RevealDataResponse {
  jobId: string;
  exactLocation: string;
  hiddenNotes: string;
  privateFallbackInstructions?: string;
  sensitiveBuyerPreferences?: string;
  handoffSecret?: string;
}

export interface QueueTimelineEventView {
  id: string;
  jobId: string;
  type: string;
  actorRole: "system" | "buyer" | "runner" | "planner" | "arbiter";
  actorAddress?: string | null;
  summary: string;
  createdAt: string;
  payload?: Record<string, unknown>;
}

export interface AgentIdentityView {
  name: string;
  role: string;
  mode: PrincipalMode;
  harness: string;
  model: string;
  walletAddress?: string | null;
  ensName?: string | null;
  registrationUrl?: string | null;
  receiptPolicy: string;
  spendPolicy: string;
  safetySummary: string[];
}

export interface AgentDecisionLogView {
  id: string;
  taskId: string;
  phase: "discover" | "plan" | "execute" | "verify" | "decide" | "submit";
  decision?: AgentDecision;
  summary: string;
  provider?: string | null;
  createdAt: string;
  payload?: Record<string, unknown>;
}

export interface QueueProofBundleView {
  jobId: string;
  stageId: string;
  stageKey: QueueStageKey;
  sequence: number;
  note?: string;
  proofHash: string;
  media: Array<{
    filename: string;
    mimeType: string;
    dataUrl: string;
  }>;
  createdAt: string;
}

export interface ApproveStageRequest {
  buyerToken: string;
  stageId: string;
  txHash?: string;
}

export interface DisputeStageRequest {
  buyerToken: string;
  stageId: string;
  reason: string;
}

export interface SettleDisputeRequest {
  buyerToken?: string;
  arbiterToken?: string;
  stageId: string;
  resolution: "release-to-runner" | "refund-buyer";
  note?: string;
}

export interface QueueJobTimelineResponse {
  job: QueueJobView;
  events: QueueTimelineEventView[];
}

export type TaskTimelineResponse = QueueJobTimelineResponse;

export interface SelfVerificationSessionView {
  sessionId: string;
  jobId: string;
  runnerAddress: string;
  accessToken?: string;
  scope: string;
  appName: string;
  endpoint: string;
  endpointType: "https" | "staging_https" | "celo" | "staging_celo";
  userId: string;
  userIdType: "hex" | "uuid";
  userDefinedData: string;
  status: "pending" | "verified" | "failed";
  provider: "self";
  reference: string;
  verifiedAt?: string | null;
  reason?: string | null;
}

export interface QueueJobsListResponse {
  jobs: QueueJobView[];
}

export type TaskListResponse = {
  tasks: QueueJobView[];
};

export interface StopTaskRequest {
  buyerToken: string;
  note?: string;
}

export interface AgentDecisionResponse {
  task: QueueJobView;
  decision: {
    action: AgentDecision;
    reason: string;
    provider?: string;
  };
  log: AgentDecisionLogView[];
}

export interface AgentLogResponse {
  identity: AgentIdentityView;
  task: QueueJobView;
  log: AgentDecisionLogView[];
}

export interface UniswapCheckApprovalRequest {
  walletAddress: string;
  amount: string;
  token: string;
  chainId?: number;
}

export interface UniswapPreparedApproval {
  to: string;
  value: string;
  from: string;
  data: string;
  gasLimit?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  chainId: number;
}

export interface UniswapCheckApprovalResponse {
  requestId?: string | null;
  approval: UniswapPreparedApproval | null;
  cancel?: UniswapPreparedApproval | null;
  gasFee?: string | null;
}

export interface UniswapQuoteRequest {
  swapper: string;
  amount: string;
  tokenIn: string;
  tokenOut: string;
  tokenInChainId?: number;
  tokenOutChainId?: number;
}

export interface UniswapPermitData {
  domain: Record<string, unknown>;
  types: Record<string, Array<{ name: string; type: string }>>;
  values: Record<string, unknown>;
}

export interface UniswapQuoteEnvelope {
  chainId: number;
  swapper: string;
  tradeType: string;
  quoteId?: string;
  gasFee?: string;
  gasFeeUSD?: string;
  input: {
    amount: string;
    token: string;
  };
  output: {
    amount: string;
    token: string;
    recipient?: string;
  };
  route?: unknown;
  txFailureReasons?: string[];
}

export interface UniswapQuoteResponse {
  requestId?: string | null;
  routing?: string | null;
  permitData?: UniswapPermitData | null;
  quote: UniswapQuoteEnvelope;
}

export interface UniswapSwapRequest {
  quote: UniswapQuoteEnvelope;
  signature: string;
  permitData?: UniswapPermitData | null;
}

export interface UniswapPreparedSwap {
  to: string;
  from: string;
  data: string;
  value: string;
  chainId: number;
  gasLimit?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

export interface UniswapSwapResponse {
  swap: UniswapPreparedSwap;
  gasFee?: string | null;
}

export interface FundingNormalizationReceiptRequest {
  buyerToken: string;
  provider: "uniswap";
  network: string;
  txHash: string;
  chainId: number;
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  outputAmount: string;
  quoteId?: string | null;
  route?: string | null;
}

export interface PaidVenueHintResponse {
  provider: "queuekeeper-x402";
  taskId?: string | null;
  signalId: string;
  coarseArea: string;
  timingWindow: string;
  recommendation: string;
  confidence: "watch" | "scout" | "hold";
  summary: string;
  purchasedAt: string;
}

export interface AgentToolPurchaseRequest {
  buyerToken: string;
  provider: "x402";
  network: string;
  txHash: string;
  payer: string;
  signal: PaidVenueHintResponse;
}

export interface EvidenceItemView {
  id: string;
  label: string;
  sponsor: string;
  status: "live" | "partial" | "planned";
  summary: string;
  href?: string;
}

export interface EvidenceResponse {
  identity: AgentIdentityView;
  deployedContracts: ExplorerLinkView[];
  evidence: EvidenceItemView[];
}

export type CreateTaskDraftRequest = CreateJobDraftRequest;
export type CreateTaskDraftResponse = CreateJobDraftResponse;

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
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

  const requiredBudget = input.scoutFee + (input.arrivalFee ?? 0) + (input.heartbeatFee ?? 0) + input.completionBonus;

  if (input.maxBudget < requiredBudget) {
    return {
      action: "abort",
      reason: "Buyer budget does not safely cover the requested staged payout plan."
    };
  }

  if (input.urgency === "high" && (input.waitingToleranceMinutes ?? 15) <= 10) {
    return {
      action: "hold-now",
      reason: "Urgency is high and the buyer tolerance is low enough that an immediate hold is safer than waiting for scout confirmation.",
      chosenRunner
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
