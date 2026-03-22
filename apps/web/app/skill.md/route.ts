import { NextResponse } from "next/server";
import { getPublicSkillMarkdown } from "../../lib/agent-manifest";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const markdown = getPublicSkillMarkdown(url.origin);

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-robots-tag": "noindex, nofollow"
    }
  });
}
