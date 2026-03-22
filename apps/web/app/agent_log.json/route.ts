import { NextResponse } from "next/server";
import { getStaticAgentLog } from "../../lib/agent-manifest";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getStaticAgentLog(), {
    headers: {
      "cache-control": "no-store, max-age=0",
      "x-robots-tag": "noindex, nofollow"
    }
  });
}
