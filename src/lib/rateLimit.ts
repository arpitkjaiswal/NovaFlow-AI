interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, RateLimitBucket>();

const LIMIT = 20; // 20 requests
const WINDOW_MS = 60 * 1000; // per minute
const REFILL_RATE = LIMIT / WINDOW_MS; // tokens per millisecond

export function rateLimit(key: string): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: LIMIT, lastRefill: now };
    buckets.set(key, bucket);
  }

  // Refill tokens based on time passed
  const timePassed = now - bucket.lastRefill;
  const refilledTokens = timePassed * REFILL_RATE;
  bucket.tokens = Math.min(LIMIT, bucket.tokens + refilledTokens);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return {
      success: true,
      limit: LIMIT,
      remaining: Math.floor(bucket.tokens),
      reset: Math.ceil((LIMIT - bucket.tokens) / REFILL_RATE)
    };
  }

  return {
    success: false,
    limit: LIMIT,
    remaining: 0,
    reset: Math.ceil((LIMIT - bucket.tokens) / REFILL_RATE)
  };
}
