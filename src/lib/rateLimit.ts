import "server-only";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

/**
 * Counts one attempt against `key` and throws once it exceeds `maxAttempts`
 * within the current window. The slot is taken *before* the protected work
 * (password check, invite compare), with atomic DB writes, so a burst of
 * parallel guesses can't all pass a stale read. A success gives the budget
 * back via recordAttempt(key, true).
 */
export async function checkRateLimit(key: string, maxAttempts = MAX_ATTEMPTS) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - WINDOW_MS);

  // Keys contain IP addresses and emails, so don't keep them around: drop
  // expired records now and then (not on every request).
  if (Math.random() < 0.02) {
    await prisma.rateLimit.deleteMany({ where: { windowAt: { lt: cutoff } } });
  }

  // Restart an expired window. Only one concurrent request can match this
  // conditional update; the others fall through to the increment below.
  const restarted = await prisma.rateLimit.updateMany({
    where: { key, windowAt: { lt: cutoff } },
    data: { count: 1, windowAt: now },
  });
  if (restarted.count > 0) return;

  const row = await prisma.rateLimit.upsert({
    where: { key },
    create: { key, count: 1, windowAt: now },
    update: { count: { increment: 1 } },
  });
  if (row.count > maxAttempts) {
    throw new Error("Too many attempts. Please try again in a few minutes.");
  }
}

/**
 * Settles an attempt. checkRateLimit already counted it, so a failure needs
 * nothing more; a success clears the counter.
 */
export async function recordAttempt(key: string, success: boolean) {
  if (success) await prisma.rateLimit.deleteMany({ where: { key } });
}

/**
 * Client IP for keying anonymous limits. x-real-ip is set by the platform
 * (Vercel) and can't be supplied by the client there; otherwise take the
 * rightmost x-forwarded-for hop - the one our nearest proxy appended -
 * never the leftmost, which the client controls.
 */
export async function getClientIp() {
  const h = await headers();
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;
  const hops = h.get("x-forwarded-for")?.split(",");
  return hops?.at(-1)?.trim() || "unknown";
}
