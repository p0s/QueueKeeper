import { handleQueueKeeperApi } from "@queuekeeper/core";
import { runPlanner, verifyRunner, type HiddenPlannerRequest } from "../../../../lib/demo-agent";

export const dynamic = "force-dynamic";

async function previewPlanner(input: HiddenPlannerRequest) {
  return runPlanner(input);
}

export async function GET(
  request: Request,
  _context: { params: Promise<{ segments: string[] }> }
) {
  return handleQueueKeeperApi(request, {
    plan: previewPlanner,
    verify: verifyRunner
  });
}

export async function POST(
  request: Request,
  _context: { params: Promise<{ segments: string[] }> }
) {
  return handleQueueKeeperApi(request, {
    plan: previewPlanner,
    verify: verifyRunner
  });
}
