import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const CODE_TTL_MS = 48 * 60 * 60 * 1000;
export const MAX_CODE_ATTEMPTS = 5;

// No 0/O/1/I/L: the code gets read aloud or retyped from a chat message.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** 8 random characters shown as XXXX-XXXX (~40 bits). */
export function generateCode(): string {
  let raw = "";
  for (let i = 0; i < 8; i++) raw += ALPHABET[randomInt(ALPHABET.length)];
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

/** Case, dashes and spaces don't matter when typing a code back in. */
export function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashCode(code: string): string {
  return createHash("sha256").update(normalizeCode(code)).digest("hex");
}

function hashesMatch(a: string, b: string) {
  return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

type Redeemed<T> = { ok: true; value: T } | { ok: false };

/**
 * Checks `code` against the one issued for `email` and, if it matches, burns
 * it and runs `createUser` in the same transaction, so a code can create at
 * most one account even under concurrent submissions. Every failure looks the
 * same to the caller. Five wrong guesses wipe the code (the owner can issue a
 * new one).
 */
export async function redeemSignupCode<T>(
  email: string,
  code: string,
  createUser: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<Redeemed<T>> {
  const req = await prisma.signupRequest.findUnique({ where: { email } });
  if (
    !req ||
    req.status !== "approved" ||
    !req.codeHash ||
    !req.expiresAt ||
    req.expiresAt.getTime() <= Date.now() ||
    req.attempts >= MAX_CODE_ATTEMPTS
  ) {
    return { ok: false };
  }

  if (!hashesMatch(hashCode(code), req.codeHash)) {
    const after = await prisma.signupRequest.update({
      where: { id: req.id },
      data: { attempts: { increment: 1 } },
    });
    if (after.attempts >= MAX_CODE_ATTEMPTS) {
      await prisma.signupRequest.update({
        where: { id: req.id },
        data: { codeHash: null, expiresAt: null },
      });
    }
    return { ok: false };
  }

  return prisma.$transaction(async (tx) => {
    const burned = await tx.signupRequest.updateMany({
      where: { id: req.id, status: "approved", codeHash: req.codeHash, expiresAt: { gt: new Date() } },
      data: { status: "used", codeHash: null },
    });
    if (burned.count !== 1) return { ok: false } as const;
    return { ok: true, value: await createUser(tx) } as const;
  });
}
