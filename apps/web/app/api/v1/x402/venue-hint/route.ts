import { type NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { getQueueKeeperCore } from "@queuekeeper/core";
import type { PaidVenueHintResponse } from "@queuekeeper/shared";
import { buildPaidVenueHint } from "../../../../../lib/venue-hint";
import { getX402RouteConfig, getX402Server } from "../../../../../lib/x402-server";

export const dynamic = "force-dynamic";

type HintErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};

async function handleVenueHint(request: NextRequest): Promise<NextResponse<PaidVenueHintResponse | HintErrorResponse>> {
  const url = new URL(request.url);
  const taskId = url.searchParams.get("taskId");
  let coarseArea = url.searchParams.get("coarseArea")?.trim() ?? "";
  let timingWindow = url.searchParams.get("timingWindow")?.trim() ?? "";

  if (taskId) {
    const task = (await getQueueKeeperCore()).getTask(taskId, "public");
    coarseArea ||= task.coarseArea;
    timingWindow ||= task.timingWindow ?? "Flexible timing";
  }

  if (!coarseArea) {
    return NextResponse.json({
      error: {
        code: "INVALID_REQUEST",
        message: "taskId or coarseArea is required for a paid venue hint."
      }
    }, { status: 400 });
  }

  const hint = await buildPaidVenueHint({
    taskId,
    coarseArea,
    timingWindow: timingWindow || "Flexible timing"
  });

  return NextResponse.json(hint, {
    status: 200,
    headers: {
      "cache-control": "no-store, max-age=0"
    }
  });
}

export const GET = withX402<PaidVenueHintResponse | HintErrorResponse>(handleVenueHint, getX402RouteConfig(), getX402Server());
