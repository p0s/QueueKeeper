export type QueueStageKey = "scout" | "arrival" | "heartbeat" | "completion";

export interface QueueStageView {
  key: QueueStageKey;
  label: string;
  amount: string;
  released: boolean;
  proofHash: string;
  timestamp: string;
}

export interface QueueJobView {
  id: string;
  title: string;
  coarseArea: string;
  status: "draft" | "posted" | "accepted" | "completed" | "expired";
  maxSpend: string;
  delegationSummary: string;
  runnerVerified: boolean;
  keptPrivate: string[];
  stages: QueueStageView[];
}

export interface PlannerInput {
  urgency: "low" | "medium" | "high";
  scoutFee: number;
  completionBonus: number;
}

export interface PlannerDecision {
  action: "scout-only" | "scout-then-hold";
  reason: string;
}

export function buildPlannerDecision(input: PlannerInput): PlannerDecision {
  if (input.urgency === "high" || input.completionBonus >= input.scoutFee * 4) {
    return {
      action: "scout-then-hold",
      reason: "Urgency or completion value justifies immediate hold after a positive scout signal."
    };
  }

  return {
    action: "scout-only",
    reason: "Default to low-risk scouting when urgency and upside are moderate."
  };
}

export const queueKeeperEscrowAbi = [] as const;
