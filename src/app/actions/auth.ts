"use server";

import bcrypt from "bcryptjs";
import { randomUUID, createHash, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";
import { checkRateLimit, recordAttempt, getClientIp } from "@/lib/rateLimit";

export type AuthState = { error: string } | undefined;

const MIN_PASSWORD_LENGTH = 8;

function normalizeEmail(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

/**
 * Constant-time comparison so the invite code can't be guessed by timing.
 * Hashing both sides to a fixed-length digest before comparing avoids the
 * naive-but-common mistake of returning early on a length mismatch, which
 * would otherwise leak the invite code's length one guess at a time.
 */
function safeEqual(a: string, b: string) {
  const bufA = createHash("sha256").update(a).digest();
  const bufB = createHash("sha256").update(b).digest();
  return timingSafeEqual(bufA, bufB);
}

/**
 * Both actions below return `{ error }` instead of throwing for expected,
 * user-facing validation failures. Next.js redacts thrown Error messages
 * crossing the server/client boundary in production ("An error occurred in
 * the Server Components render...") — confirmed by testing an actual
 * production build here, not just inferred from docs. Returned values
 * aren't Error instances, so they aren't subject to that redaction; this is
 * also exactly what the Next.js docs recommend for expected errors, paired
 * with useActionState on the client (see AuthForm.tsx).
 */

export async function signup(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim() || null;
  const inviteCode = String(formData.get("inviteCode") ?? "");

  const expectedCode = process.env.SIGNUP_INVITE_CODE;
  if (!expectedCode) {
    return { error: "Signup is not configured. Set SIGNUP_INVITE_CODE." };
  }

  // Rate limit by IP: the invite code is the only thing gating account
  // creation once this app is public, so unlimited guesses at it would
  // defeat the point of having one.
  const rateLimitKey = `signup:${await getClientIp()}`;
  try {
    await checkRateLimit(rateLimitKey);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Please try again later." };
  }

  if (!safeEqual(inviteCode, expectedCode)) {
    await recordAttempt(rateLimitKey, false);
    return { error: "That invite code is not valid." };
  }

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });

  await recordAttempt(rateLimitKey, true);
  await createSession(user.id, user.tokenVersion);
  redirect("/");
}

/**
 * A real bcrypt hash (cost 12, like real user hashes) computed once per
 * server instance and reused for every "account not found" login attempt.
 * A malformed placeholder string makes bcrypt bail out in ~1ms instead of
 * doing the ~250ms of work a real comparison takes, which leaks whether an
 * email has an account via timing alone. Comparing against a real hash of
 * an unguessable value keeps both paths doing the same work.
 */
const DUMMY_HASH = bcrypt.hash(randomUUID(), 12);

export async function login(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");

  // Keyed by email (not IP) so an attacker can't dodge the limit by
  // rotating IPs while targeting one known account; a shared IP (e.g.
  // office NAT) also won't lock out other tenants' login attempts.
  const rateLimitKey = `login:${email}`;
  try {
    await checkRateLimit(rateLimitKey);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Please try again later." };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  const hash = user?.passwordHash ?? (await DUMMY_HASH);
  const ok = await bcrypt.compare(password, hash);

  if (!user || !ok) {
    await recordAttempt(rateLimitKey, false);
    return { error: "Incorrect email or password." };
  }

  await recordAttempt(rateLimitKey, true);
  await createSession(user.id, user.tokenVersion);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
