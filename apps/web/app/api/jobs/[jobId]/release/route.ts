import { NextResponse } from "next/server";
import { type ReleaseStageRequest } from "@queuekeeper/shared";
import { releaseDemoStage } from "../../../../../lib/demo-store";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const payload = (await request.json()) as ReleaseStageRequest;

  try {
    return NextResponse.json(releaseDemoStage(jobId, payload));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stage release failed." },
      { status: 400 }
    );
  }
}
