import { NextResponse } from "next/server";
import { type QueueViewerRole } from "@queuekeeper/shared";
import { getDemoJob } from "../../../../lib/demo-store";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const url = new URL(request.url);
  const viewer = (url.searchParams.get("viewer") as QueueViewerRole | null) ?? "public";
  const revealToken = url.searchParams.get("revealToken") ?? undefined;
  const job = getDemoJob(jobId, viewer, revealToken);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json(job);
}
