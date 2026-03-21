import { NextResponse } from "next/server";
import { type SubmitProofRequest } from "@queuekeeper/shared";
import { submitDemoProof } from "../../../../../lib/demo-store";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const payload = (await request.json()) as SubmitProofRequest & { revealToken?: string };

  try {
    const job = submitDemoProof(jobId, payload, "runner", payload.revealToken);
    return NextResponse.json(job);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Proof submission failed." },
      { status: 400 }
    );
  }
}
