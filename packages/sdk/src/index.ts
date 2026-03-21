import type {
  AcceptJobRequest,
  AcceptJobResponse,
  ApproveStageRequest,
  CreateJobDraftRequest,
  CreateJobDraftResponse,
  DelegationUpdateRequest,
  DispatchJobRequest,
  DisputeStageRequest,
  PlannerInput,
  QueueJobTimelineResponse,
  QueueJobsListResponse,
  QueueProofBundleView,
  QueueViewerRole,
  RevealDataResponse,
  SettleDisputeRequest,
  SubmitProofRequest
} from "@queuekeeper/shared";

type QueueKeeperClientOptions = {
  baseUrl: string;
  fetchFn?: typeof fetch;
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export class QueueKeeperClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: QueueKeeperClientOptions) {
    this.baseUrl = trimTrailingSlash(options.baseUrl);
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async previewPlanner(input: PlannerInput) {
    return this.request<{ summary: { action: string; reason: string; selectedRunnerAddress?: string }; meta?: { provider?: string; reason?: string } }>(
      "/v1/planner/preview",
      {
        method: "POST",
        body: JSON.stringify(input)
      }
    );
  }

  async createJobDraft(input: CreateJobDraftRequest, idempotencyKey?: string) {
    return this.request<CreateJobDraftResponse>("/v1/jobs/drafts", {
      method: "POST",
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
      body: JSON.stringify(input)
    });
  }

  async postJob(jobId: string, buyerToken: string, payload: Record<string, unknown>) {
    return this.request<QueueJobTimelineResponse>(`/v1/jobs/${jobId}/post`, {
      method: "POST",
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: JSON.stringify(payload)
    });
  }

  async dispatchJob(jobId: string, payload: DispatchJobRequest) {
    return this.request<QueueJobTimelineResponse>(`/v1/jobs/${jobId}/dispatch`, {
      method: "POST",
      headers: { Authorization: `Bearer ${payload.buyerToken}` },
      body: JSON.stringify(payload)
    });
  }

  async updateDelegation(jobId: string, buyerToken: string, payload: DelegationUpdateRequest) {
    return this.request<QueueJobTimelineResponse>(`/v1/jobs/${jobId}/delegation`, {
      method: "POST",
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: JSON.stringify(payload)
    });
  }

  async listJobs(viewer: QueueViewerRole = "public") {
    return this.request<QueueJobsListResponse>(`/v1/jobs?viewer=${viewer}`, { method: "GET" });
  }

  async getJob(jobId: string, viewer: QueueViewerRole = "public", token?: string) {
    return this.request<QueueJobTimelineResponse>(`/v1/jobs/${jobId}?viewer=${viewer}`, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
  }

  async acceptJob(jobId: string, payload: AcceptJobRequest) {
    return this.request<AcceptJobResponse>(`/v1/jobs/${jobId}/accept`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async getReveal(jobId: string, revealToken: string) {
    return this.request<RevealDataResponse>(`/v1/jobs/${jobId}/reveal`, {
      method: "GET",
      headers: { Authorization: `Bearer ${revealToken}` }
    });
  }

  async submitProof(jobId: string, revealToken: string, payload: SubmitProofRequest) {
    return this.request<QueueJobTimelineResponse>(`/v1/jobs/${jobId}/proofs`, {
      method: "POST",
      headers: { Authorization: `Bearer ${revealToken}` },
      body: JSON.stringify(payload)
    });
  }

  async getProofBundle(jobId: string, stageId: string, token: string) {
    return this.request<QueueProofBundleView | null>(`/v1/jobs/${jobId}/proofs/${stageId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  async approveStage(jobId: string, payload: ApproveStageRequest) {
    return this.request<QueueJobTimelineResponse>(`/v1/jobs/${jobId}/stages/${payload.stageId}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${payload.buyerToken}` },
      body: JSON.stringify(payload)
    });
  }

  async disputeStage(jobId: string, payload: DisputeStageRequest) {
    return this.request<QueueJobTimelineResponse>(`/v1/jobs/${jobId}/stages/${payload.stageId}/dispute`, {
      method: "POST",
      headers: { Authorization: `Bearer ${payload.buyerToken}` },
      body: JSON.stringify(payload)
    });
  }

  async settleDispute(jobId: string, payload: SettleDisputeRequest) {
    const token = payload.buyerToken ?? payload.arbiterToken ?? "";
    return this.request<QueueJobTimelineResponse>(`/v1/jobs/${jobId}/dispute/settle`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
  }

  private async request<T>(path: string, init: RequestInit) {
    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(init.headers ?? {})
      }
    });
    const text = await response.text();
    const json = text ? JSON.parse(text) : {};
    if (!response.ok) {
      const message = json?.error?.message ?? json?.reason ?? `Request failed: ${response.status}`;
      throw new Error(message);
    }
    return json as T;
  }
}
