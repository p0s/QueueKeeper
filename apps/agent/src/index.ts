import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { getQueueKeeperCore, handleQueueKeeperApi } from "@queuekeeper/core";
import { AllIds, DefaultConfigStore, SelfBackendVerifier } from "@selfxyz/core";
import { createPublicClient, http } from "viem";
import {
  buildPlannerDecision,
  toPublicPlannerSummary,
  type PlannerDecision,
  type PlannerInput,
  type RunnerCandidate,
  type SelfVerificationResult
} from "@queuekeeper/shared";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const agentDir = path.resolve(currentDir, "..");
const repoRoot = path.resolve(agentDir, "../..");

loadEnv({ path: path.join(repoRoot, ".env") });
loadEnv({ path: path.join(agentDir, ".env"), override: true });
loadEnv({ path: path.join(repoRoot, ".env.local"), override: true });
loadEnv({ path: path.join(agentDir, ".env.local"), override: true });

const port = Number(process.env.PORT ?? 3001);
const rpcUrl = process.env.CELO_RPC_URL ?? "https://forno.celo-sepolia.celo-testnet.org";
const selfMode = process.env.SELF_MODE ?? "mock";
const veniceMode = process.env.VENICE_MODE ?? (process.env.VENICE_API_KEY ? "live" : "mock");

const client = createPublicClient({
  transport: http(rpcUrl)
});

type HiddenPlannerRequest = {
  urgency: "low" | "medium" | "high";
  scoutFee: number;
  completionBonus: number;
  maxBudget: number;
  hiddenExactLocation: string;
  hiddenNotes?: string;
  candidates: RunnerCandidate[];
};

type AcceptJobRequest = {
  jobId: string;
  runnerAddress: string;
  verificationPayload: {
    reference?: string;
    mockVerified?: boolean;
    proof?: unknown;
    publicSignals?: string[] | string;
    attestationId?: number | string;
    userContextData?: string;
    signal?: string;
  };
};

interface PlannerProvider {
  decide(input: PlannerInput): Promise<PlannerDecision>;
}

class MockVenicePlannerProvider implements PlannerProvider {
  async decide(input: PlannerInput) {
    return buildPlannerDecision(input);
  }
}

class LiveVenicePlannerProvider implements PlannerProvider {
  async decide(input: PlannerInput): Promise<PlannerDecision> {
    const apiKey = process.env.VENICE_API_KEY;
    if (!apiKey) {
      throw new Error("VENICE_API_KEY missing");
    }

    const response = await fetch("https://api.venice.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.VENICE_MODEL ?? "venice-uncensored",
        messages: [
          {
            role: "system",
            content:
              "You are QueueKeeper's private planner. Decide exactly one of: scout-only, scout-then-hold, abort. Return JSON with keys action and reason only."
          },
          {
            role: "user",
            content: JSON.stringify({
              urgency: input.urgency,
              scoutFee: input.scoutFee,
              completionBonus: input.completionBonus,
              maxBudget: input.maxBudget,
              hiddenExactLocation: input.hiddenExactLocation,
              hiddenNotes: input.hiddenNotes,
              candidates: input.candidates
            })
          }
        ],
        venice_parameters: {
          include_venice_system_prompt: false
        },
        temperature: 0.2,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "queuekeeper_planner_decision",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                action: {
                  type: "string",
                  enum: ["scout-only", "scout-then-hold", "abort"]
                },
                reason: {
                  type: "string"
                }
              },
              required: ["action", "reason"]
            }
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Venice request failed: ${response.status} ${await response.text()}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("Venice response missing content");

    const parsed = JSON.parse(content) as { action: PlannerDecision["action"]; reason: string };
    return {
      action: parsed.action,
      reason: parsed.reason,
      chosenRunner: input.candidates.find((candidate) => candidate.verifiedHuman) ?? input.candidates[0]
    };
  }
}

interface SelfVerifier {
  verify(input: AcceptJobRequest["verificationPayload"]): Promise<SelfVerificationResult>;
}

class MockSelfVerifier implements SelfVerifier {
  async verify(input: AcceptJobRequest["verificationPayload"]): Promise<SelfVerificationResult> {
    if (!input.mockVerified) {
      return {
        status: "blocked",
        provider: "mock-self",
        reference: input.reference ?? "mock-self-blocked"
      };
    }

    return {
      status: "verified",
      provider: "mock-self",
      reference: input.reference ?? "mock-self-verified"
    };
  }
}

class LiveSelfVerifier implements SelfVerifier {
  async verify(input: AcceptJobRequest["verificationPayload"]): Promise<SelfVerificationResult> {
    const apiUrl = process.env.SELF_API_URL;
    if (!apiUrl) throw new Error("SELF_API_URL missing");

    let proof: unknown;
    let publicSignals: string[] | undefined;

    try {
      proof = typeof input.proof === "string" ? JSON.parse(input.proof) : input.proof;
      publicSignals = Array.isArray(input.publicSignals)
        ? input.publicSignals
        : typeof input.publicSignals === "string"
          ? JSON.parse(input.publicSignals)
          : undefined;
    } catch (error) {
      return {
        status: "blocked",
        provider: "self",
        reference: input.reference ?? "self-live-blocked",
        reason: error instanceof Error ? error.message : "Invalid Self payload JSON."
      };
    }

    const attestationId = input.attestationId === undefined ? undefined : Number(input.attestationId);

    if (!proof || !publicSignals || !attestationId || !input.userContextData) {
      return {
        status: "blocked",
        provider: "self",
        reference: input.reference ?? "self-live-blocked",
        reason: "Self live verification requires proof, publicSignals, attestationId, and userContextData."
      };
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.SELF_API_KEY ? { Authorization: `Bearer ${process.env.SELF_API_KEY}` } : {})
      },
      body: JSON.stringify({
        proof,
        publicSignals,
        attestationId,
        userContextData: input.userContextData,
        reference: input.reference
      })
    });

    const json = (await response.json()) as {
      verified?: boolean;
      result?: boolean;
      status?: string;
      reason?: string;
      message?: string;
      reference?: string;
    };
    const verified = response.ok && (json.verified ?? json.result ?? false);
    return {
      status: verified ? "verified" : "blocked",
      provider: "self",
      reference: json.reference ?? input.reference ?? "self-live-reference",
      reason: verified ? undefined : (json.reason ?? json.message ?? `Self request failed: ${response.status}`)
    };
  }
}

function getPlannerProvider(): PlannerProvider {
  return veniceMode === "live" ? new LiveVenicePlannerProvider() : new MockVenicePlannerProvider();
}

function getSelfVerifier(): SelfVerifier {
  return selfMode === "live" ? new LiveSelfVerifier() : new MockSelfVerifier();
}

function json<T>(status: number, body: T) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

async function previewPlanner(payload: HiddenPlannerRequest) {
  const planner = getPlannerProvider();
  let decision: PlannerDecision;
  let provider = veniceMode;
  let reason: string | undefined;

  try {
    decision = await planner.decide(payload);
  } catch (error) {
    decision = buildPlannerDecision(payload);
    provider = veniceMode === "live" ? "venice-fallback" : "mock";
    reason = error instanceof Error ? error.message : String(error);
  }

  return {
    summary: toPublicPlannerSummary(decision),
    meta: {
      provider,
      reason,
      hiddenFieldsPersistedServerSideOnly: ["hiddenExactLocation", "hiddenNotes", "maxBudget"]
    }
  };
}

async function verifySession(input: { sessionId: string; payload: Record<string, unknown> }) {
  const session = (await getQueueKeeperCore()).getSelfVerificationSessionForVerification(input.sessionId);
  const verifier = new SelfBackendVerifier(
    session.scope,
    session.endpoint,
    String(process.env.SELF_MOCK_PASSPORT ?? "true") === "true",
    AllIds,
    new DefaultConfigStore({
      minimumAge: 18,
      excludedCountries: [],
      ofac: false
    }),
    session.userIdType
  );

  try {
    const result = await verifier.verify(
      Number(input.payload.attestationId) as never,
      input.payload.proof as never,
      (input.payload.publicSignals ?? input.payload.pubSignals) as never,
      String(input.payload.userContextData ?? session.userDefinedData)
    );
    return {
      verified: result.isValidDetails.isValid,
      reason: result.isValidDetails.isValid ? null : "Self verification did not pass cryptographic validation.",
      resultJson: result
    };
  } catch {
    const verification = await getSelfVerifier().verify({
      reference: session.reference,
      proof: input.payload.proof,
      publicSignals: (input.payload.publicSignals ?? input.payload.pubSignals) as string[] | string | undefined,
      attestationId: input.payload.attestationId as number | string | undefined,
      userContextData: input.payload.userContextData as string | undefined
    });
    return {
      verified: verification.status === "verified",
      reason: verification.reason ?? null,
      resultJson: verification
    };
  }
}

async function handlePlanner(request: Request) {
  const payload = (await request.json()) as HiddenPlannerRequest;
  return json(200, await previewPlanner(payload));
}

async function handleAccept(request: Request) {
  const payload = (await request.json()) as AcceptJobRequest;
  const verifier = getSelfVerifier();
  const verification = await verifier.verify(payload.verificationPayload);

  if (verification.status !== "verified") {
    return json(403, {
      accepted: false,
      reason: verification.reason ?? "Runner verification failed",
      verification
    });
  }

  return json(200, {
    accepted: true,
    jobId: payload.jobId,
    runnerAddress: payload.runnerAddress,
    acceptanceRecord: {
      verificationReference: verification.reference,
      verificationProvider: verification.provider,
      exactLocationRevealAllowed: true
    }
  });
}

const server = createServer(async (req, res) => {
  try {
    const base = `http://${req.headers.host ?? `127.0.0.1:${port}`}`;
    const url = new URL(req.url ?? "/", base);
    const chunks: Buffer[] = [];

    for await (const chunk of req) chunks.push(Buffer.from(chunk));

    const request = new Request(url, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : Buffer.concat(chunks)
    });

    let response: Response;

    if (req.method === "GET" && url.pathname === "/health") {
      const chainId = await client.getChainId();
      response = json(200, { ok: true, chainId, plannerProvider: veniceMode, selfMode });
    } else if (url.pathname.startsWith("/v1/")) {
      response = await handleQueueKeeperApi(request, {
        plan: previewPlanner,
        verify: async (payload) => getSelfVerifier().verify(payload),
        verifySession
      });
    } else if (req.method === "POST" && url.pathname === "/planner/decide") {
      response = await handlePlanner(request);
    } else if (req.method === "POST" && url.pathname === "/jobs/accept") {
      response = await handleAccept(request);
    } else {
      response = json(404, { error: "not_found" });
    }

    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    res.end(await response.text());
  } catch (error) {
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "internal_error", message: error instanceof Error ? error.message : String(error) }));
  }
});

async function main() {
  const chainId = await client.getChainId();
  server.listen(port, () => {
    console.log(`[queuekeeper-agent] listening on :${port}`);
    console.log(`[queuekeeper-agent] chainId=${chainId}`);
    console.log(`[queuekeeper-agent] planner=${veniceMode} self=${selfMode}`);
  });
}

main().catch((error) => {
  console.error("agent boot failed", error);
  process.exit(1);
});
