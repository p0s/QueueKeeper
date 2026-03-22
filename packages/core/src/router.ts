import type {
  AcceptJobVerificationPayload,
  AgentDecision,
  AgentToolPurchaseRequest,
  ApproveStageRequest,
  BuyerJobFormInput,
  DisputeStageRequest,
  DispatchJobRequest,
  FundingNormalizationReceiptRequest,
  PlannerAction,
  PlannerInput,
  PrincipalMode,
  PublicPlannerSummary,
  QueueJobMode,
  SelfVerificationResult
} from "@queuekeeper/shared";
import { getQueueKeeperCore, persistQueueKeeperCore } from "./index";

type PlannerResult = {
  summary: {
    action: "scout-only" | "scout-then-hold" | "hold-now" | "abort";
    reason: string;
    selectedRunnerAddress?: string;
  };
  meta?: {
    provider?: string;
    reason?: string;
  };
};

type QueueKeeperRouterDeps = {
  plan: (input: PlannerInput) => Promise<PlannerResult>;
  verify: (input: AcceptJobVerificationPayload) => Promise<SelfVerificationResult>;
  verifySession?: (input: { sessionId: string; payload: Record<string, unknown> }) => Promise<{ verified: boolean; reason?: string | null; resultJson?: unknown }>;
};

type JsonRecord = Record<string, unknown>;

const plannerActions = new Set<PlannerAction>(["scout-only", "scout-then-hold", "hold-now", "abort"]);
const principalModes = new Set<PrincipalMode>(["HUMAN", "AGENT"]);
const queueJobModes = new Set<QueueJobMode>(["DIRECT_DISPATCH", "VERIFIED_POOL"]);

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store, max-age=0"
    }
  });
}

function readBearer(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return undefined;
  return authHeader.slice("Bearer ".length);
}

function invalidRequest(message: string, details?: Record<string, unknown>) {
  const error = new Error(message) as Error & { code: string; details?: Record<string, unknown> };
  error.code = "INVALID_REQUEST";
  error.details = details;
  return error;
}

function ensureRecord(value: unknown, message = "Request body must be a JSON object.") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw invalidRequest(message);
  }
  return value as JsonRecord;
}

function getFirstDefined(body: JsonRecord, keys: string[]) {
  for (const key of keys) {
    if (body[key] !== undefined) return body[key];
  }
  return undefined;
}

function readOptionalString(body: JsonRecord, keys: string[], label: string) {
  const value = getFirstDefined(body, keys);
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw invalidRequest(`${label} must be a string.`);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readRequiredString(body: JsonRecord, keys: string[], label: string) {
  const value = readOptionalString(body, keys, label);
  if (!value) {
    throw invalidRequest(`${label} is required.`);
  }
  return value;
}

function readOptionalNumber(body: JsonRecord, keys: string[], label: string) {
  const value = getFirstDefined(body, keys);
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  throw invalidRequest(`${label} must be a finite number.`);
}

function readRequiredNumber(body: JsonRecord, keys: string[], label: string) {
  const value = readOptionalNumber(body, keys, label);
  if (value === undefined) {
    throw invalidRequest(`${label} is required.`);
  }
  return value;
}

function readOptionalInteger(body: JsonRecord, keys: string[], label: string) {
  const value = readOptionalNumber(body, keys, label);
  if (value === undefined) return undefined;
  if (!Number.isInteger(value)) {
    throw invalidRequest(`${label} must be an integer.`);
  }
  return value;
}

function readOptionalBoolean(body: JsonRecord, keys: string[], label: string) {
  const value = getFirstDefined(body, keys);
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw invalidRequest(`${label} must be a boolean.`);
}

function readRequiredBoolean(body: JsonRecord, keys: string[], label: string) {
  const value = readOptionalBoolean(body, keys, label);
  if (value === undefined) {
    throw invalidRequest(`${label} is required.`);
  }
  return value;
}

function normalizePlannerAction(value: string | undefined) {
  if (!value) return undefined;
  if (!plannerActions.has(value as PlannerAction)) {
    throw invalidRequest("plannerPreview.action must be one of scout-only, scout-then-hold, hold-now, or abort.");
  }
  return value as PlannerAction;
}

function normalizePrincipalMode(value: string | undefined) {
  if (!value) return undefined;
  if (!principalModes.has(value as PrincipalMode)) {
    throw invalidRequest("principalMode must be HUMAN or AGENT.");
  }
  return value as PrincipalMode;
}

function normalizeQueueJobMode(value: string | undefined) {
  if (!value) return undefined;
  if (!queueJobModes.has(value as QueueJobMode)) {
    throw invalidRequest("mode must be DIRECT_DISPATCH or VERIFIED_POOL.");
  }
  return value as QueueJobMode;
}

function readOptionalExpiryMinutes(body: JsonRecord) {
  const expiresInMinutes = readOptionalInteger(body, ["expiresInMinutes"], "expiresInMinutes");
  if (expiresInMinutes !== undefined) {
    return expiresInMinutes;
  }

  const expiresAt = readOptionalString(body, ["expiresAt"], "expiresAt");
  if (!expiresAt) return undefined;

  const expiresAtMs = Date.parse(expiresAt);
  if (Number.isNaN(expiresAtMs)) {
    throw invalidRequest("expiresAt must be a valid ISO-8601 timestamp.");
  }

  const remainingMinutes = Math.ceil((expiresAtMs - Date.now()) / 60_000);
  if (remainingMinutes <= 0) {
    throw invalidRequest("expiresAt must be in the future.");
  }
  return remainingMinutes;
}

function readRequiredExpiryMinutes(body: JsonRecord) {
  const value = readOptionalExpiryMinutes(body);
  if (value === undefined) {
    throw invalidRequest("expiresInMinutes is required. Pass a positive integer or an ISO-8601 expiresAt timestamp.");
  }
  return value;
}

function deriveUrgency(body: JsonRecord): PlannerInput["urgency"] {
  const urgency = readOptionalString(body, ["urgency"], "urgency");
  if (urgency) {
    if (urgency === "low" || urgency === "medium" || urgency === "high") {
      return urgency;
    }
    throw invalidRequest("urgency must be low, medium, or high.");
  }

  const expiryMinutes = readOptionalExpiryMinutes(body);
  if (expiryMinutes !== undefined) {
    if (expiryMinutes <= 45) return "high";
    if (expiryMinutes <= 120) return "medium";
  }

  return "medium";
}

function normalizeRunnerCandidates(body: JsonRecord): PlannerInput["candidates"] {
  const rawCandidates = getFirstDefined(body, ["candidates", "runnerCandidates"]);
  if (rawCandidates !== undefined) {
    if (!Array.isArray(rawCandidates)) {
      throw invalidRequest("candidates must be an array.");
    }

    return rawCandidates.map((candidate, index) => {
      const candidateBody = ensureRecord(candidate, `candidates[${index}] must be an object.`);
      return {
        address: readRequiredString(candidateBody, ["address"], `candidates[${index}].address`),
        score: readRequiredNumber(candidateBody, ["score"], `candidates[${index}].score`),
        verifiedHuman: readRequiredBoolean(candidateBody, ["verifiedHuman"], `candidates[${index}].verifiedHuman`),
        etaMinutes: readRequiredNumber(candidateBody, ["etaMinutes"], `candidates[${index}].etaMinutes`)
      };
    });
  }

  const selectedRunnerAddress = readOptionalString(body, ["selectedRunnerAddress", "runnerAddress"], "selectedRunnerAddress");
  if (!selectedRunnerAddress) {
    throw invalidRequest("Planner preview requires a candidates array or selectedRunnerAddress.");
  }

  return [{
    address: selectedRunnerAddress,
    score: readOptionalNumber(body, ["score", "runnerScore"], "score") ?? 90,
    verifiedHuman: readOptionalBoolean(body, ["verifiedHuman", "runnerVerifiedHuman"], "verifiedHuman") ?? true,
    etaMinutes: readOptionalNumber(body, ["etaMinutes", "runnerEtaMinutes"], "etaMinutes") ?? 5
  }];
}

function normalizePlannerPreview(value: unknown): PublicPlannerSummary | undefined {
  if (value === undefined || value === null) return undefined;
  const body = ensureRecord(value, "plannerPreview must be an object.");
  return {
    action: normalizePlannerAction(readRequiredString(body, ["action"], "plannerPreview.action")) ?? "scout-then-hold",
    reason: readRequiredString(body, ["reason"], "plannerPreview.reason"),
    selectedRunnerAddress: readOptionalString(body, ["selectedRunnerAddress"], "plannerPreview.selectedRunnerAddress")
  };
}

function normalizePlannerInput(value: unknown): PlannerInput {
  const body = ensureRecord(value);
  return {
    urgency: deriveUrgency(body),
    scoutFee: readRequiredNumber(body, ["scoutFee", "scoutFeeUsd"], "scoutFee"),
    arrivalFee: readOptionalNumber(body, ["arrivalFee", "arrivalFeeUsd"], "arrivalFee"),
    heartbeatFee: readOptionalNumber(body, ["heartbeatFee", "heartbeatFeeUsd"], "heartbeatFee"),
    completionBonus: readRequiredNumber(body, ["completionBonus", "completionFeeUsd"], "completionBonus"),
    maxBudget: readRequiredNumber(body, ["maxBudget", "maxSpendUsd"], "maxBudget"),
    hiddenExactLocation: readRequiredString(body, ["hiddenExactLocation", "exactLocation"], "hiddenExactLocation"),
    hiddenNotes: readOptionalString(body, ["hiddenNotes", "notes"], "hiddenNotes"),
    privateFallbackInstructions: readOptionalString(body, ["privateFallbackInstructions", "fallbackInstructions"], "privateFallbackInstructions"),
    waitingToleranceMinutes: readOptionalInteger(body, ["waitingToleranceMinutes"], "waitingToleranceMinutes"),
    mode: normalizeQueueJobMode(readOptionalString(body, ["mode"], "mode")),
    candidates: normalizeRunnerCandidates(body)
  };
}

function normalizeBuyerJobFormInput(value: unknown) {
  const body = ensureRecord(value);
  const plannerPreview = normalizePlannerPreview(body.plannerPreview);
  return {
    payload: {
      id: readOptionalString(body, ["id"], "id"),
      mode: normalizeQueueJobMode(readOptionalString(body, ["mode"], "mode")),
      principalMode: normalizePrincipalMode(readOptionalString(body, ["principalMode"], "principalMode")),
      title: readRequiredString(body, ["title"], "title"),
      coarseArea: readRequiredString(body, ["coarseArea"], "coarseArea"),
      timingWindow: readOptionalString(body, ["timingWindow"], "timingWindow"),
      exactLocation: readRequiredString(body, ["exactLocation", "hiddenExactLocation"], "exactLocation"),
      hiddenNotes: readRequiredString(body, ["hiddenNotes", "notes"], "hiddenNotes"),
      privateFallbackInstructions: readOptionalString(body, ["privateFallbackInstructions", "fallbackInstructions"], "privateFallbackInstructions"),
      sensitiveBuyerPreferences: readOptionalString(body, ["sensitiveBuyerPreferences"], "sensitiveBuyerPreferences"),
      handoffSecret: readOptionalString(body, ["handoffSecret"], "handoffSecret"),
      waitingToleranceMinutes: readOptionalInteger(body, ["waitingToleranceMinutes"], "waitingToleranceMinutes"),
      maxSpendUsd: readRequiredNumber(body, ["maxSpendUsd", "maxBudget"], "maxSpendUsd"),
      scoutFeeUsd: readRequiredNumber(body, ["scoutFeeUsd", "scoutFee"], "scoutFeeUsd"),
      arrivalFeeUsd: readRequiredNumber(body, ["arrivalFeeUsd", "arrivalFee"], "arrivalFeeUsd"),
      heartbeatFeeUsd: readRequiredNumber(body, ["heartbeatFeeUsd", "heartbeatFee"], "heartbeatFeeUsd"),
      completionFeeUsd: readRequiredNumber(body, ["completionFeeUsd", "completionBonus"], "completionFeeUsd"),
      expiresInMinutes: readRequiredExpiryMinutes(body),
      heartbeatCount: readOptionalInteger(body, ["heartbeatCount"], "heartbeatCount"),
      heartbeatIntervalSeconds: readOptionalInteger(body, ["heartbeatIntervalSeconds"], "heartbeatIntervalSeconds"),
      buyerAddress: readOptionalString(body, ["buyerAddress"], "buyerAddress"),
      selectedRunnerAddress: readOptionalString(body, ["selectedRunnerAddress", "runnerAddress"], "selectedRunnerAddress") ?? plannerPreview?.selectedRunnerAddress,
      plannerPreview
    } satisfies BuyerJobFormInput,
    plannerInput: body.plannerInput === undefined ? undefined : normalizePlannerInput(body.plannerInput)
  };
}

function parseBuyerForm(body: BuyerJobFormInput, planner?: PlannerResult): BuyerJobFormInput & {
  plannerAction?: PlannerResult["summary"]["action"];
  plannerReason?: string;
  plannerProvider?: string;
} {
  return {
    ...body,
    plannerPreview: planner?.summary ?? body.plannerPreview,
    plannerAction: planner?.summary.action ?? body.plannerPreview?.action,
    plannerReason: planner?.summary.reason ?? body.plannerPreview?.reason,
    plannerProvider: planner?.meta?.provider
  };
}

function toAgentDecision(
  task: { currentStage: string; stages: Array<{ key: string; status: string }> },
  planner: PlannerResult
): AgentDecision {
  if (planner.summary.action === "abort") return "abort";
  if (task.currentStage.toLowerCase().includes("complete")) return "complete";
  if (task.currentStage.toLowerCase().includes("scout")) {
    return planner.summary.action === "scout-only" ? "scout-again" : "escalate-to-hold";
  }
  if (task.stages.some((stage) => stage.key === "heartbeat" && stage.status === "pending-proof")) {
    return "continue-hold";
  }
  return "complete";
}

export async function handleQueueKeeperApi(request: Request, deps: QueueKeeperRouterDeps) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/^\/api/, "");
  const segments = pathname.split("/").filter(Boolean);
  const core = await getQueueKeeperCore();

  try {
    if (request.method === "GET" && pathname === "/v1/openapi.json") {
      return json(200, core.openApiDocument(`${url.origin}/v1`));
    }

    if (request.method === "GET" && pathname === "/v1/evidence") {
      return json(200, core.getEvidence());
    }

    if (request.method === "POST" && pathname === "/v1/internal/reconcile") {
      const internalToken = process.env.QUEUEKEEPER_INTERNAL_API_TOKEN;
      const bearer = readBearer(request);
      if (!internalToken || bearer !== internalToken) {
        return json(401, {
          error: {
            code: "UNAUTHORIZED",
            message: "Valid internal reconcile token required."
          }
        });
      }
      const response = core.reconcileAllJobs();
      await persistQueueKeeperCore(core);
      return json(200, response);
    }

    if (request.method === "POST" && pathname === "/v1/planner/preview") {
      const payload = normalizePlannerInput(await request.json());
      return json(200, await deps.plan(payload));
    }

    if (request.method === "POST" && (pathname === "/v1/jobs/drafts" || pathname === "/v1/tasks/drafts")) {
      const parsed = normalizeBuyerJobFormInput(await request.json());
      const idempotencyKey = request.headers.get("Idempotency-Key") ?? undefined;
      const planner = parsed.payload.plannerPreview
        ? undefined
        : parsed.plannerInput
          ? await deps.plan(parsed.plannerInput)
          : undefined;
      return json(200, core.createTaskDraft(parseBuyerForm(parsed.payload, planner), idempotencyKey));
    }

    if (segments[0] === "v1" && segments[1] === "self" && segments[2] === "sessions" && request.method === "POST" && segments.length === 3) {
      const payload = (await request.json()) as { jobId: string; runnerAddress: string };
      const response = core.createSelfVerificationSession(payload.jobId, payload.runnerAddress, url.origin);
      await persistQueueKeeperCore(core);
      return json(200, response);
    }

    if (segments[0] === "v1" && segments[1] === "self" && segments[2] === "sessions" && segments[3] && request.method === "GET") {
      return json(200, core.getSelfVerificationSession(segments[3], readBearer(request) ?? ""));
    }

    if (segments[0] === "v1" && segments[1] === "self" && segments[2] === "sessions" && segments[3] && segments[4] === "verify" && request.method === "POST") {
      if (!deps.verifySession) {
        return json(501, {
          error: {
            code: "NOT_IMPLEMENTED",
            message: "Self session verification is not configured."
          }
        });
      }
      const payload = (await request.json()) as Record<string, unknown>;
      const result = await deps.verifySession({ sessionId: segments[3], payload });
      const response = core.completeSelfVerificationSession(segments[3], result);
      await persistQueueKeeperCore(core);
      return json(200, response);
    }

    if (request.method === "GET" && (pathname === "/v1/jobs" || pathname === "/v1/tasks")) {
      const viewer = (url.searchParams.get("viewer") as "public" | "buyer" | "runner" | null) ?? "public";
      const listed = pathname === "/v1/tasks" ? core.listTasks(viewer) : core.listJobs(viewer);
      return json(200, listed);
    }

    if (segments[0] === "v1" && (segments[1] === "jobs" || segments[1] === "tasks") && segments[2]) {
      const jobId = segments[2];
      const bearer = readBearer(request);

      if (request.method === "GET" && segments.length === 3) {
        const viewer = (url.searchParams.get("viewer") as "public" | "buyer" | "runner" | null) ?? "public";
        return json(200, core.getTaskTimeline(jobId, viewer, {
          buyerToken: viewer === "buyer" ? bearer : undefined,
          revealToken: viewer === "runner" ? bearer : undefined
        }));
      }

      if (request.method === "POST" && segments[3] === "post") {
        const payload = (await request.json()) as Record<string, unknown>;
        const response = core.postTask({
          jobId,
          buyerToken: bearer ?? "",
          onchainJobId: (payload.onchainJobId as string | null | undefined) ?? null,
          txHash: (payload.txHash as string | null | undefined) ?? null,
          delegation: payload.delegation as never
        });
        await persistQueueKeeperCore(core);
        return json(200, response);
      }

      if (request.method === "POST" && segments[3] === "dispatch") {
        const payload = (await request.json()) as DispatchJobRequest;
        const response = core.dispatchTask(jobId, {
          buyerToken: bearer ?? "",
          runnerAddress: payload.runnerAddress
        });
        await persistQueueKeeperCore(core);
        return json(200, response);
      }

      if (request.method === "POST" && segments[3] === "delegation") {
        const payload = (await request.json()) as Record<string, unknown>;
        const response = core.updateDelegation(jobId, payload as never, bearer ?? "");
        await persistQueueKeeperCore(core);
        return json(200, response);
      }

      if (request.method === "POST" && segments[3] === "accept") {
        const payload = (await request.json()) as { runnerAddress: string; verificationPayload: AcceptJobVerificationPayload; txHash?: string };
        let verification: SelfVerificationResult;
        if (payload.verificationPayload.sessionId) {
          const session = core.getSelfVerificationSessionForVerification(payload.verificationPayload.sessionId);
          verification = session.status === "verified"
            ? {
                status: "verified",
                provider: "self",
                reference: session.reference
              }
            : {
                status: "blocked",
                provider: "self",
                reference: session.reference,
                reason: session.reason ?? "Self verification session is not verified."
              };
        } else {
          verification = await deps.verify(payload.verificationPayload);
        }
        if (verification.status !== "verified") {
          return json(403, {
            accepted: false,
            reason: verification.reason ?? "Runner verification failed",
            verification
          });
        }
        const response = core.acceptTask(jobId, payload.runnerAddress, verification, payload.txHash);
        await persistQueueKeeperCore(core);
        return json(200, response);
      }

      if (request.method === "GET" && segments[3] === "reveal") {
        return json(200, core.getRevealData(jobId, bearer ?? ""));
      }

      if (request.method === "GET" && segments[3] === "timeline") {
        const viewer = (url.searchParams.get("viewer") as "public" | "buyer" | "runner" | null) ?? "public";
        return json(200, core.getTaskTimeline(jobId, viewer, {
          buyerToken: viewer === "buyer" ? bearer : undefined,
          revealToken: viewer === "runner" ? bearer : undefined
        }));
      }

      if (request.method === "POST" && segments[3] === "proofs" && segments.length === 4) {
        const payload = await request.json();
        const response = core.submitTaskProof(jobId, bearer ?? "", payload as never);
        await persistQueueKeeperCore(core);
        return json(200, response);
      }

      if (request.method === "GET" && segments[3] === "proofs" && segments[4]) {
        return json(200, core.getProofBundle(jobId, segments[4], {
          buyerToken: bearer,
          revealToken: bearer
        }));
      }

      if (request.method === "POST" && segments[3] === "stages" && segments[4] && segments[5] === "approve") {
        const payload = (await request.json()) as Partial<ApproveStageRequest>;
        const response = core.approveTaskStage(jobId, {
          ...payload,
          buyerToken: bearer ?? "",
          stageId: segments[4]
        });
        await persistQueueKeeperCore(core);
        return json(200, response);
      }

      if (request.method === "POST" && segments[3] === "stages" && segments[4] && segments[5] === "dispute") {
        const payload = (await request.json()) as Partial<DisputeStageRequest>;
        if (!payload.reason) {
          return json(400, {
            error: {
              code: "INVALID_REQUEST",
              message: "Dispute reason is required."
            }
          });
        }
        const response = core.disputeStage(jobId, {
          buyerToken: bearer ?? "",
          stageId: segments[4],
          reason: payload.reason
        });
        await persistQueueKeeperCore(core);
        return json(200, response);
      }

      if (request.method === "POST" && segments[3] === "stop") {
        const payload = (await request.json()) as { note?: string };
        const response = core.stopTask(jobId, {
          buyerToken: bearer ?? "",
          note: payload.note
        });
        await persistQueueKeeperCore(core);
        return json(200, response);
      }

      if (request.method === "POST" && segments[3] === "funding" && segments[4] === "normalized") {
        const payload = (await request.json()) as FundingNormalizationReceiptRequest;
        const response = core.recordFundingNormalization(jobId, {
          ...payload,
          buyerToken: bearer ?? ""
        });
        await persistQueueKeeperCore(core);
        return json(200, response);
      }

      if (request.method === "POST" && segments[3] === "agent" && segments[4] === "decide") {
        const context = core.getAgentDecisionContext(jobId, bearer ?? "");
        const planner = await deps.plan(context);
        const task = core.getTask(jobId, "buyer", { buyerToken: bearer ?? "" });
        const response = core.logAgentDecision(jobId, bearer ?? "", {
          action: toAgentDecision(task, planner),
          reason: planner.summary.reason,
          provider: planner.meta?.provider ?? null,
          plannerAction: planner.summary.action
        });
        await persistQueueKeeperCore(core);
        return json(200, response);
      }

      if (request.method === "GET" && segments[3] === "agent" && segments[4] === "log") {
        return json(200, core.getAgentLog(jobId, bearer ?? ""));
      }

      if (request.method === "POST" && segments[3] === "agent" && segments[4] === "tool-purchase") {
        const payload = (await request.json()) as AgentToolPurchaseRequest;
        const response = core.recordAgentToolPurchase(jobId, {
          ...payload,
          buyerToken: bearer ?? ""
        });
        await persistQueueKeeperCore(core);
        return json(200, response);
      }

      if (request.method === "POST" && segments[3] === "dispute" && segments[4] === "settle") {
        const payload = (await request.json()) as Record<string, unknown>;
        if (typeof payload.stageId !== "string" || typeof payload.resolution !== "string") {
          return json(400, {
            error: {
              code: "INVALID_REQUEST",
              message: "stageId and resolution are required for dispute settlement."
            }
          });
        }
        const response = core.settleDispute(jobId, {
          ...payload,
          stageId: payload.stageId as string,
          resolution: payload.resolution as "release-to-runner" | "refund-buyer",
          buyerToken: (payload.buyerToken as string | undefined) ?? bearer,
          arbiterToken: (payload.arbiterToken as string | undefined) ?? bearer
        });
        await persistQueueKeeperCore(core);
        return json(200, response);
      }
    }

    return json(404, {
      error: {
        code: "NOT_FOUND",
        message: `Unhandled route ${pathname}`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "INTERNAL_ERROR";
    const details = typeof error === "object" && error && "details" in error
      ? (error as { details?: Record<string, unknown> }).details
      : undefined;
    return json(code === "NOT_FOUND" ? 404 : code === "UNAUTHORIZED" ? 401 : code === "VERIFICATION_FAILED" ? 403 : 400, {
      error: {
        code,
        message,
        ...(details ? { details } : {})
      }
    });
  }
}
