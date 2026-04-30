import { NextResponse } from "next/server";
import { getStaticAgentJson } from "../../lib/agent-manifest";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getStaticAgentJson(), {
    headers: {
      "cache-control": "no-store, max-age=0",
      "x-robots-tag": "noindex, nofollow"
    }
  });
}
