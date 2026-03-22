import { handleQueueKeeperApi } from "@queuekeeper/core";
import { getQueueKeeperCore } from "@queuekeeper/core";
import { runPlanner, runPreviewPlanner, verifyRunner, type HiddenPlannerRequest } from "../../../../lib/demo-agent";
import { verifySelfPayload } from "../../../../lib/self";

export const dynamic = "force-dynamic";

async function previewPlanner(input: HiddenPlannerRequest) {
  return runPreviewPlanner(input);
}

function selectPlanner(request: Request) {
  const pathname = new URL(request.url).pathname.replace(/^\/api/, "");
  return /^\/v1\/(?:jobs|tasks)\/[^/]+\/agent\/decide$/.test(pathname) ? runPlanner : previewPlanner;
}

async function verifySession(input: { sessionId: string; payload: Record<string, unknown> }) {
  const session = (await getQueueKeeperCore()).getSelfVerificationSessionForVerification(input.sessionId);

  try {
    return await verifySelfPayload(session, input.payload);
  } catch {
    const verification = await verifyRunner({
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

export async function GET(
  request: Request,
  _context: { params: Promise<{ segments: string[] }> }
) {
  return handleQueueKeeperApi(request, {
    plan: selectPlanner(request),
    verify: verifyRunner,
    verifySession
  });
}

export async function POST(
  request: Request,
  _context: { params: Promise<{ segments: string[] }> }
) {
  return handleQueueKeeperApi(request, {
    plan: selectPlanner(request),
    verify: verifyRunner,
    verifySession
  });
}
