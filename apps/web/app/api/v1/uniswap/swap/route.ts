import { requestUniswapSwap } from "../../../../../lib/uniswap-server";
import { rateLimitByIp } from "../../../../../lib/rate-limit";

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
  const limit = rateLimitByIp(request, {
    scope: "uniswap-swap",
    windowMs: 60_000,
    max: 10
  });
  if (!limit.allowed) {
    return json(429, {
      error: {
        code: "RATE_LIMITED",
        message: `Too many swap preparation requests. Retry in ${limit.retryAfterSeconds}s.`
      }
    });
  }

  try {
    const body = await request.json();
    return json(200, await requestUniswapSwap(body));
  } catch (error) {
    return json(400, {
      error: {
        code: "UNISWAP_SWAP_FAILED",
        message: error instanceof Error ? error.message : "Unable to prepare Uniswap swap."
      }
    });
  }
}
