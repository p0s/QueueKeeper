import type { PlannerAction, QueueJobView } from "@queuekeeper/shared";

const agentBaseUrl = process.env.NEXT_PUBLIC_AGENT_BASE_URL ?? "";

export interface PlannerPreviewResult {
  action: PlannerAction;
  reason: string;
  selectedRunnerAddress?: string;
}

export async function requestPlannerPreview(job: QueueJobView): Promise<PlannerPreviewResult> {
  const response = await fetch(`${agentBaseUrl}/planner/decide`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      urgency: job.id === "qk-1" ? "high" : "medium",
      scoutFee: Number(job.stages.find((stage) => stage.key === "scout")?.amount.split(" ")[0] ?? 0),
      completionBonus: Number(job.stages.find((stage) => stage.key === "completion")?.amount.split(" ")[0] ?? 0),
      maxBudget: Number(job.maxSpend.split(" ")[0]),
      hiddenExactLocation: "encrypted:exact-location",
      hiddenNotes: "encrypted:buyer-notes",
      candidates: [
        { address: "0xA11CE", score: 92, verifiedHuman: true, etaMinutes: 6 },
        { address: "0xB0B", score: 81, verifiedHuman: false, etaMinutes: 4 }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Planner request failed: ${response.status}`);
  }

  const json = await response.json() as { summary: PlannerPreviewResult };
  return json.summary;
}

export async function requestRunnerAcceptance(jobId: string, mockVerified: boolean) {
  const response = await fetch(`${agentBaseUrl}/jobs/accept`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jobId,
      runnerAddress: "0xA11CE",
      verificationPayload: {
        reference: `self-${jobId}`,
        mockVerified
      }
    })
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.reason ?? `Acceptance failed: ${response.status}`);
  }

  return json as {
    accepted: true;
    acceptanceRecord: {
      verificationReference: string;
      verificationProvider: string;
      exactLocationRevealAllowed: boolean;
    };
  };
}
