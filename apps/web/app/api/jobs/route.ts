import { NextResponse } from "next/server";
import { type BuyerJobFormInput, type QueueViewerRole } from "@queuekeeper/shared";
import { listDemoJobs, upsertDemoJob } from "../../../lib/demo-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const viewer = (url.searchParams.get("viewer") as QueueViewerRole | null) ?? "public";
  return NextResponse.json(listDemoJobs(viewer));
}

export async function POST(request: Request) {
  const payload = (await request.json()) as BuyerJobFormInput;
  return NextResponse.json(upsertDemoJob(payload));
}
