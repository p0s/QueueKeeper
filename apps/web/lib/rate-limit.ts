declare global {
  var __queuekeeperRateLimitBuckets: Map<string, number[]> | undefined;
}

type RateLimitOptions = {
  scope: string;
  windowMs: number;
  max: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

function getBuckets() {
  if (!globalThis.__queuekeeperRateLimitBuckets) {
    globalThis.__queuekeeperRateLimitBuckets = new Map<string, number[]>();
  }
  return globalThis.__queuekeeperRateLimitBuckets;
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || "unknown";
}

export function rateLimitByIp(request: Request, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const cutoff = now - options.windowMs;
  const key = `${options.scope}:${getClientIp(request)}`;
  const buckets = getBuckets();
  const recent = (buckets.get(key) ?? []).filter((timestamp) => timestamp > cutoff);

  if (recent.length >= options.max) {
    const oldest = recent[0] ?? now;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + options.windowMs - now) / 1000))
    };
  }

  recent.push(now);
  buckets.set(key, recent);
  return {
    allowed: true,
    retryAfterSeconds: 0
  };
}
