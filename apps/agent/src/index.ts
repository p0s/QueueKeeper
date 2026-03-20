import "dotenv/config";
import { createServer } from "node:http";
import { createPublicClient, http } from "viem";
import { celoAlfajores } from "viem/chains";
import {
  buildPlannerDecision,
  toPublicPlannerSummary,
  type PlannerInput,
  type RunnerCandidate,
  type SelfVerificationResult
} from "@queuekeeper/shared";

const port = Number(process.env.PORT ?? 3001);
const rpcUrl = process.env.CELO_RPC_URL ?? celoAlfajores.rpcUrls.default.http[0];
const selfMode = process.env.SELF_MODE ?? "mock";
const veniceMode = process.env.VENICE_MODE ?? "mock";

const client = createPublicClient({
  chain: celoAlfajores,
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
  };
};

interface PlannerProvider {
  decide(input: PlannerInput): Promise<ReturnType<typeof buildPlannerDecision>>;
}

class MockVenicePlannerProvider implements PlannerProvider {
  async decide(input: PlannerInput) {
    return buildPlannerDecision(input);
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

function getPlannerProvider(): PlannerProvider {
  // Real Venice integration plugs in here. Keep the app-facing contract stable so
  // the provider can swap without rewriting web routes or job orchestration code.
  return new MockVenicePlannerProvider();
}

function getSelfVerifier(): SelfVerifier {
  // A live Self integration should replace this adapter when credentials and
  // verification wiring are available. The explicit dev flag avoids pretending
  // that mock verification is production-grade.
  if (selfMode !== "mock") {
    throw new Error(`Unsupported SELF_MODE: ${selfMode}`);
  }
  return new MockSelfVerifier();
}

function json<T>(status: number, body: T) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

async function handlePlanner(request: Request) {
  const payload = (await request.json()) as HiddenPlannerRequest;
  const planner = getPlannerProvider();
  const decision = await planner.decide(payload);

  return json(200, {
    summary: toPublicPlannerSummary(decision),
    meta: {
      provider: veniceMode,
      hiddenFieldsPersistedServerSideOnly: ["hiddenExactLocation", "hiddenNotes", "maxBudget"]
    }
  });
}

async function handleAccept(request: Request) {
  const payload = (await request.json()) as AcceptJobRequest;
  const verifier = getSelfVerifier();
  const verification = await verifier.verify(payload.verificationPayload);

  if (verification.status !== "verified") {
    return json(403, {
      accepted: false,
      reason: "Runner verification failed",
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
