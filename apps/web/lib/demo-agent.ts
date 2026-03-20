import {
  buildPlannerDecision,
  toPublicPlannerSummary,
  type PlannerInput,
  type SelfVerificationResult
} from "@queuekeeper/shared";

export type HiddenPlannerRequest = PlannerInput;

export type AcceptJobRequest = {
  jobId: string;
  runnerAddress: string;
  verificationPayload: {
    reference?: string;
    mockVerified?: boolean;
  };
};

export function verifyRunner(payload: AcceptJobRequest["verificationPayload"]): SelfVerificationResult {
  if (!payload.mockVerified) {
    return {
      status: "blocked",
      provider: "mock-self",
      reference: payload.reference ?? "mock-self-blocked"
    };
  }

  return {
    status: "verified",
    provider: "mock-self",
    reference: payload.reference ?? "mock-self-verified"
  };
}

export async function runPlanner(input: HiddenPlannerRequest) {
  const decision = buildPlannerDecision(input);

  return {
    summary: toPublicPlannerSummary(decision),
    meta: {
      provider: "mock",
      hiddenFieldsPersistedServerSideOnly: ["hiddenExactLocation", "hiddenNotes", "maxBudget"]
    }
  };
}
