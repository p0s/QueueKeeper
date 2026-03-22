import { requestUniswapApproval } from "../../../../../lib/uniswap-server";

export const dynamic = "force-dynamic";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store, max-age=0"
    }
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return json(200, await requestUniswapApproval(body));
  } catch (error) {
    return json(400, {
      error: {
        code: "UNISWAP_APPROVAL_FAILED",
        message: error instanceof Error ? error.message : "Unable to prepare Uniswap approval."
      }
    });
  }
}
