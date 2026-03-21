import {
  type AcceptJobRequest,
  type AcceptJobResponse,
  type BuyerJobFormInput,
  type DelegationUpdateRequest,
  type PlannerAction,
  type QueueJobView,
  type QueueStageKey,
  type ReleaseStageRequest,
  type SubmitProofRequest
} from "@queuekeeper/shared";
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

async function readJson<T>(response: Response): Promise<T> {
  const json = (await response.json()) as T & { reason?: string; error?: string };
  if (!response.ok) {
    throw new Error(json.reason ?? json.error ?? `Request failed: ${response.status}`);
  }
  return json;
}

export async function requestPlannerPreview(form: BuyerJobFormInput): Promise<PlannerPreviewResult> {
  const response = await fetch(buildAgentUrl("/planner/decide", "/api/planner/decide"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(buildPlannerInputFromBuyerForm(form))
  });

  const json = await readJson<{
    summary: PlannerPreviewResult;
    meta?: { provider?: string; reason?: string };
  }>(response);
  return {
    ...json.summary,
    provider: json.meta?.provider,
    providerReason: json.meta?.reason
  };
}

export async function createOrUpdateDemoJob(form: BuyerJobFormInput): Promise<QueueJobView> {
  const response = await fetch("/api/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(form)
  });

  return readJson<QueueJobView>(response);
}

export async function fetchDemoJob(jobId: string, viewer: "buyer" | "runner" | "public", revealToken?: string): Promise<QueueJobView> {
  const query = new URLSearchParams({ viewer });
  if (revealToken) {
    query.set("revealToken", revealToken);
  }

  const response = await fetch(`/api/jobs/${jobId}?${query.toString()}`);
  return readJson<QueueJobView>(response);
}

export async function requestRunnerAcceptance(payload: AcceptJobRequest): Promise<AcceptJobResponse> {
  if (!agentBaseUrl) {
    const response = await fetch("/api/jobs/accept", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    return readJson<AcceptJobResponse>(response);
  }

  const externalResponse = await fetch(buildAgentUrl("/jobs/accept", "/api/jobs/accept"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const externalJson = await readJson<Partial<AcceptJobResponse> & {
    acceptanceRecord?: Partial<AcceptJobResponse["acceptanceRecord"]>;
  }>(externalResponse);

  const localResponse = await fetch("/api/jobs/accept", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const localJson = await readJson<AcceptJobResponse>(localResponse);

  return {
    ...localJson,
    acceptanceRecord: {
      ...localJson.acceptanceRecord,
      ...externalJson.acceptanceRecord
    }
  };
}

export async function submitDemoProof(jobId: string, request: SubmitProofRequest, revealToken?: string): Promise<QueueJobView> {
  const response = await fetch(`/api/jobs/${jobId}/proof`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...request,
      revealToken
    })
  });

  return readJson<QueueJobView>(response);
}

export async function releaseDemoStage(jobId: string, request: ReleaseStageRequest): Promise<QueueJobView> {
  const response = await fetch(`/api/jobs/${jobId}/release`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request)
  });

  return readJson<QueueJobView>(response);
}

export async function updateDemoDelegation(jobId: string, request: DelegationUpdateRequest): Promise<QueueJobView> {
  const response = await fetch(`/api/jobs/${jobId}/delegation`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request)
  });

  return readJson<QueueJobView>(response);
}

export function makeDefaultProofHash(stageKey: QueueStageKey, jobId: string) {
  return `0x${jobId.replace(/[^a-z0-9]/gi, "").slice(0, 16)}${stageKey.padEnd(16, "0")}`;
}
