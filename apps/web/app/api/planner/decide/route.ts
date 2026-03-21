import { NextResponse } from "next/server";
import { runPlanner, type HiddenPlannerRequest } from "../../../../lib/demo-agent";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = (await request.json()) as HiddenPlannerRequest;
  const result = await runPlanner(payload);
  return NextResponse.json(result);
}
