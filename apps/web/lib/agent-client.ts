import type {
  AcceptJobRequest,
  AcceptJobResponse,
  AgentDecisionResponse,
  AgentLogResponse,
  ApproveStageRequest,
  BuyerJobFormInput,
  DelegationUpdateRequest,
  EvidenceResponse,
  PlannerAction,
  QueueJobView,
  QueueStageKey,
  SubmitProofRequest
} from "@queuekeeper/shared";
import { QueueKeeperClient } from "@queuekeeper/sdk";
import { buildPlannerInputFromBuyerForm } from "./demo-data";

const agentBaseUrl = process.env.NEXT_PUBLIC_AGENT_BASE_URL?.trim() ?? "";

export interface PlannerPreviewResult {
  action: PlannerAction;
  reason: string;
  selectedRunnerAddress?: string;
  provider?: string;
  providerReason?: string;
}

function buildAgentUrl(externalPath: string, demoPath: string) {
  if (!agentBaseUrl) {
    return demoPath;
  }

  return `${agentBaseUrl.replace(/\/+$/, "")}${externalPath}`;
}

function getApiBaseUrl() {
  if (!agentBaseUrl) {
    return "/api";
  }
  return `${agentBaseUrl.replace(/\/+$/, "")}`;
}

function getClient() {
  return new QueueKeeperClient({
    baseUrl: getApiBaseUrl()
  });
}

function getLocalClient() {
  return new QueueKeeperClient({
    baseUrl: "/api"
  });
}

async function readJson<T>(response: Response): Promise<T> {
  const json = (await response.json()) as T & { reason?: string; error?: string };
  if (!response.ok) {
    throw new Error(json.reason ?? json.error ?? `Request failed: ${response.status}`);
  }
  return json;
}

export async function requestPlannerPreview(form: BuyerJobFormInput): Promise<PlannerPreviewResult> {
  const json = await getClient().previewPlanner(buildPlannerInputFromBuyerForm(form));
  return {
    ...(json.summary as PlannerPreviewResult),
    provider: json.meta?.provider,
    providerReason: json.meta?.reason
  };
}

export async function createAndPostJob(form: BuyerJobFormInput, idempotencyKey?: string): Promise<{ job: QueueJobView; buyerToken: string }> {
  const client = getClient();
  const draft = await client.createTaskDraft(form, idempotencyKey);
  const posted = await client.postTask(draft.job.id, draft.buyerToken, {});
  return {
    job: posted.job,
    buyerToken: draft.buyerToken
  };
}

export async function fetchDemoJob(jobId: string, viewer: "buyer" | "runner" | "public", revealToken?: string): Promise<QueueJobView> {
  const response = await getClient().getTask(jobId, viewer, revealToken);
  return response.job;
}

export async function requestRunnerAcceptance(payload: AcceptJobRequest): Promise<AcceptJobResponse> {
  if (!agentBaseUrl) {
    return getClient().acceptTask(payload.jobId, payload);
  }

  const externalResponse = await fetch(buildAgentUrl("/jobs/accept", "/api/jobs/accept"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const externalJson = await readJson<Partial<AcceptJobResponse> & {
    acceptanceRecord?: Partial<AcceptJobResponse["acceptanceRecord"]>;
  }>(externalResponse);

  const localJson = await getLocalClient().acceptTask(payload.jobId, payload);

  return {
    ...localJson,
    acceptanceRecord: {
      ...localJson.acceptanceRecord,
      ...externalJson.acceptanceRecord
    }
  };
}

export async function submitDemoProof(jobId: string, request: SubmitProofRequest, revealToken?: string): Promise<QueueJobView> {
  const response = await getClient().submitTaskProof(jobId, revealToken ?? "", request);
  return response.job;
}

export async function fetchProofBundle(jobId: string, stageId: string, token: string) {
  return getClient().getTaskProofBundle(jobId, stageId, token);
}

export async function createSelfVerificationSession(jobId: string, runnerAddress: string) {
  return getClient().createSelfSession(jobId, runnerAddress);
}

export async function fetchSelfVerificationSession(sessionId: string, accessToken?: string) {
  return getClient().getSelfSession(sessionId, accessToken);
}

export async function approveDemoStage(jobId: string, request: ApproveStageRequest): Promise<QueueJobView> {
  const response = await getClient().approveTaskStage(jobId, request);
  return response.job;
}

export async function disputeDemoStage(jobId: string, buyerToken: string, stageId: string, reason: string): Promise<QueueJobView> {
  const response = await getClient().disputeTaskStage(jobId, {
    buyerToken,
    stageId,
    reason
  });
  return response.job;
}

export async function updateDemoDelegation(jobId: string, buyerToken: string, request: DelegationUpdateRequest): Promise<QueueJobView> {
  const response = await getClient().updateDelegation(jobId, buyerToken, request);
  return response.job;
}

export async function stopTask(jobId: string, buyerToken: string, note?: string): Promise<QueueJobView> {
  const response = await getClient().stopTask(jobId, buyerToken, note);
  return response.job;
}

export async function requestAgentDecision(jobId: string, buyerToken: string): Promise<AgentDecisionResponse> {
  return getClient().decideTask(jobId, buyerToken);
}

export async function fetchAgentLog(jobId: string, buyerToken: string): Promise<AgentLogResponse> {
  return getClient().getTaskAgentLog(jobId, buyerToken);
}

export async function fetchEvidence(): Promise<EvidenceResponse> {
  return getClient().getEvidence();
}

export function makeDefaultProofHash(stageKey: QueueStageKey, jobId: string) {
  return `0x${jobId.replace(/[^a-z0-9]/gi, "").slice(0, 16)}${stageKey.padEnd(16, "0")}`;
}
