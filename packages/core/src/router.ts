import {
  buildPlannerDecision,
  type AcceptJobVerificationPayload,
  type ApproveStageRequest,
  type BuyerJobFormInput,
  type DisputeStageRequest,
  type DispatchJobRequest,
  type PlannerInput,
  type SelfVerificationResult
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

export async function handleQueueKeeperApi(request: Request, deps: QueueKeeperRouterDeps) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/^\/api/, "");
  const segments = pathname.split("/").filter(Boolean);
  const core = await getQueueKeeperCore();

  try {
    if (request.method === "GET" && pathname === "/v1/openapi.json") {
      return json(200, core.openApiDocument(`${url.origin}/v1`));
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
      const payload = (await request.json()) as PlannerInput;
      return json(200, await deps.plan(payload));
    }

    if (request.method === "POST" && pathname === "/v1/jobs/drafts") {
      const payload = (await request.json()) as BuyerJobFormInput & { plannerInput?: PlannerInput };
      const idempotencyKey = request.headers.get("Idempotency-Key") ?? undefined;
      const planner = payload.plannerPreview
        ? undefined
        : payload.plannerInput
          ? await deps.plan(payload.plannerInput)
          : undefined;
      return json(200, core.createJobDraft(parseBuyerForm(payload, planner), idempotencyKey));
    }

    if (segments[0] === "v1" && segments[1] === "self" && segments[2] === "sessions" && request.method === "POST" && segments.length === 3) {
      const payload = (await request.json()) as { jobId: string; runnerAddress: string };
      return json(200, core.createSelfVerificationSession(payload.jobId, payload.runnerAddress, url.origin));
    }

    if (segments[0] === "v1" && segments[1] === "self" && segments[2] === "sessions" && segments[3] && request.method === "GET") {
      return json(200, core.getSelfVerificationSession(segments[3]));
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
      return json(200, core.completeSelfVerificationSession(segments[3], result));
    }

    if (request.method === "GET" && pathname === "/v1/jobs") {
      const viewer = (url.searchParams.get("viewer") as "public" | "buyer" | "runner" | null) ?? "public";
      return json(200, core.listJobs(viewer));
    }

    if (segments[0] === "v1" && segments[1] === "jobs" && segments[2]) {
      const jobId = segments[2];
      const bearer = readBearer(request);

      if (request.method === "GET" && segments.length === 3) {
        const viewer = (url.searchParams.get("viewer") as "public" | "buyer" | "runner" | null) ?? "public";
        return json(200, core.getTimeline(jobId, viewer, {
          buyerToken: viewer === "buyer" ? bearer : undefined,
          revealToken: viewer === "runner" ? bearer : undefined
        }));
      }

      if (request.method === "POST" && segments[3] === "post") {
        const payload = (await request.json()) as Record<string, unknown>;
        const response = core.postJob({
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
        const response = core.dispatchJob(jobId, {
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
          const session = core.getSelfVerificationSession(payload.verificationPayload.sessionId);
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
        const response = core.acceptJob(jobId, payload.runnerAddress, verification, payload.txHash);
        await persistQueueKeeperCore(core);
        return json(200, response);
      }

      if (request.method === "GET" && segments[3] === "reveal") {
        return json(200, core.getRevealData(jobId, bearer ?? ""));
      }

      if (request.method === "GET" && segments[3] === "timeline") {
        const viewer = (url.searchParams.get("viewer") as "public" | "buyer" | "runner" | null) ?? "public";
        return json(200, core.getTimeline(jobId, viewer, {
          buyerToken: viewer === "buyer" ? bearer : undefined,
          revealToken: viewer === "runner" ? bearer : undefined
        }));
      }

      if (request.method === "POST" && segments[3] === "proofs" && segments.length === 4) {
        const payload = await request.json();
        const response = core.submitProof(jobId, bearer ?? "", payload as never);
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
        const response = core.approveStage(jobId, {
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
    return json(code === "NOT_FOUND" ? 404 : code === "UNAUTHORIZED" ? 401 : code === "VERIFICATION_FAILED" ? 403 : 400, {
      error: {
        code,
        message
      }
    });
  }
}
