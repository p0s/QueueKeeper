import type {
  AcceptJobRequest,
  AcceptJobResponse,
  AgentDecisionResponse,
  AgentLogResponse,
  AgentToolPurchaseRequest,
  ApproveStageRequest,
  CreateJobDraftRequest,
  CreateJobDraftResponse,
  DelegationUpdateRequest,
  DispatchJobRequest,
  DisputeStageRequest,
  EvidenceResponse,
  FundingNormalizationReceiptRequest,
  PlannerInput,
  UniswapCheckApprovalRequest,
  UniswapCheckApprovalResponse,
  UniswapQuoteRequest,
  UniswapQuoteResponse,
  UniswapSwapRequest,
  UniswapSwapResponse,
  PaidVenueHintResponse,
  QueueJobTimelineResponse,
  QueueJobsListResponse,
  QueueProofBundleView,
  SelfVerificationSessionView,
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

  async createTaskDraft(input: CreateJobDraftRequest, idempotencyKey?: string) {
    return this.request<CreateJobDraftResponse>("/v1/tasks/drafts", {
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

  async postTask(taskId: string, buyerToken: string, payload: Record<string, unknown>) {
    return this.request<QueueJobTimelineResponse>(`/v1/tasks/${taskId}/post`, {
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

  async dispatchTask(taskId: string, payload: DispatchJobRequest) {
    return this.request<QueueJobTimelineResponse>(`/v1/tasks/${taskId}/dispatch`, {
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

  async listTasks(viewer: QueueViewerRole = "public") {
    return this.request<{ tasks: QueueJobsListResponse["jobs"] }>(`/v1/tasks?viewer=${viewer}`, { method: "GET" });
  }

  async getJob(jobId: string, viewer: QueueViewerRole = "public", token?: string) {
    return this.request<QueueJobTimelineResponse>(`/v1/jobs/${jobId}?viewer=${viewer}`, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
  }

  async getTask(taskId: string, viewer: QueueViewerRole = "public", token?: string) {
    return this.request<QueueJobTimelineResponse>(`/v1/tasks/${taskId}?viewer=${viewer}`, {
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

  async acceptTask(taskId: string, payload: AcceptJobRequest) {
    return this.request<AcceptJobResponse>(`/v1/tasks/${taskId}/accept`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async createSelfSession(jobId: string, runnerAddress: string) {
    return this.request<SelfVerificationSessionView>("/v1/self/sessions", {
      method: "POST",
      body: JSON.stringify({ jobId, runnerAddress })
    });
  }

  async getSelfSession(sessionId: string, accessToken?: string) {
    return this.request<SelfVerificationSessionView>(`/v1/self/sessions/${sessionId}`, {
      method: "GET",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
    });
  }

  async getReveal(jobId: string, revealToken: string) {
    return this.request<RevealDataResponse>(`/v1/jobs/${jobId}/reveal`, {
      method: "GET",
      headers: { Authorization: `Bearer ${revealToken}` }
    });
  }

  async getTaskReveal(taskId: string, revealToken: string) {
    return this.request<RevealDataResponse>(`/v1/tasks/${taskId}/reveal`, {
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

  async submitTaskProof(taskId: string, revealToken: string, payload: SubmitProofRequest) {
    return this.request<QueueJobTimelineResponse>(`/v1/tasks/${taskId}/proofs`, {
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

  async getTaskProofBundle(taskId: string, stageId: string, token: string) {
    return this.request<QueueProofBundleView | null>(`/v1/tasks/${taskId}/proofs/${stageId}`, {
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

  async approveTaskStage(taskId: string, payload: ApproveStageRequest) {
    return this.request<QueueJobTimelineResponse>(`/v1/tasks/${taskId}/stages/${payload.stageId}/approve`, {
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

  async disputeTaskStage(taskId: string, payload: DisputeStageRequest) {
    return this.request<QueueJobTimelineResponse>(`/v1/tasks/${taskId}/stages/${payload.stageId}/dispute`, {
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

  async stopTask(taskId: string, buyerToken: string, note?: string) {
    return this.request<QueueJobTimelineResponse>(`/v1/tasks/${taskId}/stop`, {
      method: "POST",
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: JSON.stringify({ note })
    });
  }

  async decideTask(taskId: string, buyerToken: string) {
    return this.request<AgentDecisionResponse>(`/v1/tasks/${taskId}/agent/decide`, {
      method: "POST",
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: JSON.stringify({})
    });
  }

  async getTaskAgentLog(taskId: string, buyerToken: string) {
    return this.request<AgentLogResponse>(`/v1/tasks/${taskId}/agent/log`, {
      method: "GET",
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
  }

  async getEvidence() {
    return this.request<EvidenceResponse>("/v1/evidence", {
      method: "GET"
    });
  }

  async recordTaskFundingNormalization(taskId: string, payload: FundingNormalizationReceiptRequest) {
    return this.request<QueueJobTimelineResponse>(`/v1/tasks/${taskId}/funding/normalized`, {
      method: "POST",
      headers: { Authorization: `Bearer ${payload.buyerToken}` },
      body: JSON.stringify(payload)
    });
  }

  async recordTaskAgentToolPurchase(taskId: string, payload: AgentToolPurchaseRequest) {
    return this.request<QueueJobTimelineResponse>(`/v1/tasks/${taskId}/agent/tool-purchase`, {
      method: "POST",
      headers: { Authorization: `Bearer ${payload.buyerToken}` },
      body: JSON.stringify(payload)
    });
  }

  async checkUniswapApproval(payload: UniswapCheckApprovalRequest) {
    return this.request<UniswapCheckApprovalResponse>("/v1/uniswap/check-approval", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async getUniswapQuote(payload: UniswapQuoteRequest) {
    return this.request<UniswapQuoteResponse>("/v1/uniswap/quote", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async buildUniswapSwap(payload: UniswapSwapRequest) {
    return this.request<UniswapSwapResponse>("/v1/uniswap/swap", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async getPaidVenueHint(taskId?: string) {
    const query = taskId ? `?taskId=${encodeURIComponent(taskId)}` : "";
    return this.request<PaidVenueHintResponse>(`/v1/x402/venue-hint${query}`, {
      method: "GET"
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
