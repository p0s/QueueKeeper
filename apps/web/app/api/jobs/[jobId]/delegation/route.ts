import { NextResponse } from "next/server";
import { type DelegationUpdateRequest } from "@queuekeeper/shared";
import { updateDemoDelegation } from "../../../../../lib/demo-store";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const payload = (await request.json()) as DelegationUpdateRequest;

  try {
    return NextResponse.json(updateDemoDelegation(jobId, payload));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delegation update failed." },
      { status: 400 }
    );
  }
}
