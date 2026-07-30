import "server-only";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

/**
 * Throws if `key` has hit MAX_ATTEMPTS failures within the current window.
 * Call before doing the protected work; call recordAttempt after, with the
 * outcome, regardless of which branch this returns.
 */
export async function checkRateLimit(key: string) {
  const row = await prisma.rateLimit.findUnique({ where: { key } });
  if (!row) return;

  const windowExpired = Date.now() - row.windowAt.getTime() >= WINDOW_MS;
  if (!windowExpired && row.count >= MAX_ATTEMPTS) {
    throw new Error("Too many attempts. Please try again in a few minutes.");
  }
}

/**
 * Records the outcome of an attempt against `key`. A success clears the
 * counter; a failure increments it, starting a fresh window if the
 * previous one has expired.
 */
export async function recordAttempt(key: string, success: boolean) {
  if (success) {
    await prisma.rateLimit.deleteMany({ where: { key } });
    return;
  }

  const now = new Date();
  const row = await prisma.rateLimit.findUnique({ where: { key } });
  const windowExpired = !row || now.getTime() - row.windowAt.getTime() >= WINDOW_MS;

  if (windowExpired) {
    await prisma.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, windowAt: now },
      update: { count: 1, windowAt: now },
    });
  } else {
    await prisma.rateLimit.update({
      where: { key },
      data: { count: { increment: 1 } },
    });
  }
}

/** Best-effort client IP from proxy headers, for keying anonymous limits. */
export async function getClientIp() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}
