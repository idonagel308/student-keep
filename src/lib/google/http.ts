const MAX_ATTEMPTS = 6;
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 8000;

type Options = {
  maxAttempts?: number;
  /** Injectable so tests don't really wait. */
  sleep?: (ms: number) => Promise<void>;
};

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Google's Calendar API limits how fast one user can send requests, and it
 * signals that with a 403 whose reason is "rateLimitExceeded" (not a 429), so
 * a plain status check misses it. Those, 429s and 5xx are temporary: wait
 * and retry with exponential backoff, as Google's docs recommend. Everything
 * else (including a 403 for a disabled API or missing permission, and daily
 * quota) is returned as is for the caller to turn into an error.
 */
async function isRetryable(res: Response): Promise<boolean> {
  if (res.status === 429 || res.status >= 500) return true;
  if (res.status !== 403) return false;
  const body = (await res.clone().text().catch(() => "")).toLowerCase();
  return body.includes("ratelimitexceeded") || body.includes("rate limit exceeded");
}

function delayFor(attempt: number, res: Response): number {
  const retryAfter = Number(res.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(retryAfter * 1000, MAX_DELAY_MS);
  const backoff = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
  return backoff + Math.random() * 250;
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  { maxAttempts = MAX_ATTEMPTS, sleep = realSleep }: Options = {}
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, init);
    if (attempt >= maxAttempts - 1 || !(await isRetryable(res))) return res;
    await sleep(delayFor(attempt, res));
  }
}
