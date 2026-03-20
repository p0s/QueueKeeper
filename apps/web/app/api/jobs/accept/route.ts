import { NextResponse } from "next/server";
import { verifyRunner, type AcceptJobRequest } from "../../../../lib/demo-agent";

export async function POST(request: Request) {
  const payload = (await request.json()) as AcceptJobRequest;
  const verification = await verifyRunner(payload.verificationPayload);

  if (verification.status !== "verified") {
    return NextResponse.json({
      accepted: false,
      reason: "Runner verification failed",
      verification
    }, { status: 403 });
  }

  return NextResponse.json({
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
