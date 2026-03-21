import { NextResponse } from "next/server";
import type { AcceptJobRequest } from "@queuekeeper/shared";
import { acceptDemoJob } from "../../../../lib/demo-store";
import { verifyRunner } from "../../../../lib/demo-agent";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = (await request.json()) as AcceptJobRequest;
  const verification = await verifyRunner(payload.verificationPayload);

  if (verification.status !== "verified") {
    return NextResponse.json({
      accepted: false,
      reason: verification.reason ?? "Runner verification failed",
      verification
    }, { status: 403 });
  }

  try {
    return NextResponse.json(acceptDemoJob(payload.jobId, payload.runnerAddress, verification, payload.txHash));
  } catch (error) {
    return NextResponse.json(
      { reason: error instanceof Error ? error.message : "Acceptance failed." },
      { status: 400 }
    );
  }
}
