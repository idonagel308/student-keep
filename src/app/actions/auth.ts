"use server";

import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";
import { getValidAccessToken, revokeGoogleToken } from "@/lib/google/auth";
import { collectFileUrls, deleteFiles, deleteGoogleItems } from "@/lib/cleanup";
import { checkRateLimit, recordAttempt, getClientIp } from "@/lib/rateLimit";
import { getCurrentUser, requireUser } from "@/lib/dal";
import { redeemSignupCode } from "@/lib/signupCode";

export type AuthState = { error: string } | undefined;

const MIN_PASSWORD_LENGTH = 8;
// bcrypt only reads the first 72 bytes; rejecting longer input is clearer
// than silently ignoring the tail.
const MAX_PASSWORD_BYTES = 72;

// Per-account cap across all IPs, high enough that a stranger cannot lock
// the owner out with a handful of guesses but low enough to stop a
// distributed guessing run.
const LOGIN_ACCOUNT_MAX_ATTEMPTS = 40;

function normalizeEmail(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
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
  const code = String(formData.get("inviteCode") ?? "");

  // Checked before the code is touched, so a typo here never burns it.
  if (!email || !email.includes("@") || email.length > 254) {
    return { error: "Enter a valid email address." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (Buffer.byteLength(password) > MAX_PASSWORD_BYTES) {
    return { error: `Password must be at most ${MAX_PASSWORD_BYTES} bytes.` };
  }

  // The per-email code limit is the main brake on guessing; this adds a
  // per-IP one so a single client can't probe many emails.
  const rateLimitKey = `signup:${await getClientIp()}`;
  try {
    await checkRateLimit(rateLimitKey);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Please try again later." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let result;
  try {
    result = await redeemSignupCode(email, code, (tx) =>
      tx.user.create({
        data: { email, passwordHash, name, hasCompletedOnboarding: false },
      })
    );
  } catch {
    // Unique-email violation rolls the transaction back, so the code survives.
    return { error: "An account with that email already exists." };
  }
  if (!result.ok) {
    return { error: "That code is not valid for this email, or it has expired." };
  }

  await recordAttempt(rateLimitKey, true);
  await createSession(result.value.id, result.value.tokenVersion);
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

  // Two limits. The strict one is keyed by IP + email, so a stranger failing
  // against someone's address only locks out their own IP rather than the
  // real owner. The looser per-email one still stops guessing spread over
  // many IPs.
  const ip = await getClientIp();
  const rateLimitKey = `login:${ip}:${email}`;
  const accountKey = `login-account:${email}`;
  try {
    await checkRateLimit(rateLimitKey);
    await checkRateLimit(accountKey, LOGIN_ACCOUNT_MAX_ATTEMPTS);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Please try again later." };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  const hash = user?.passwordHash ?? (await DUMMY_HASH);
  const ok = await bcrypt.compare(password, hash);

  if (!user || !ok) {
    await recordAttempt(rateLimitKey, false);
    await recordAttempt(accountKey, false);
    return { error: "Incorrect email or password." };
  }

  await recordAttempt(rateLimitKey, true);
  await recordAttempt(accountKey, true);
  await createSession(user.id, user.tokenVersion);
  redirect("/");
}

export async function logout() {
  // Bumping tokenVersion invalidates every outstanding session JWT (checked
  // in getCurrentUser), so a copied cookie dies on logout instead of living
  // out its 30 days. Side effect: logging out signs out all devices.
  const user = await getCurrentUser();
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: { increment: 1 } },
    });
  }
  await deleteSession();
  // Without this, the browser's client-side Router Cache can keep serving
  // a stale, already-rendered copy of a page like /signup from earlier in
  // the session (when it silently redirected to "/" for a logged-in user)
  // — clicking a <Link> to it after logging out would replay that stale
  // decision instead of re-checking auth state.
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Permanently deletes the current user and everything they own: database
 * rows (Prisma's onDelete: Cascade fans out from one delete call), the
 * uploaded PDFs in storage, and the calendar events/tasks synced to their
 * Google account, which is also disconnected. File and Google cleanup are
 * best-effort and run around the row delete; confirmation happens
 * client-side (see Settings.tsx) and there is no undo.
 */
export async function deleteAccount() {
  const user = await requireUser();

  if (user.googleRefreshToken) {
    try {
      const accessToken = await getValidAccessToken(user);
      if (accessToken) await deleteGoogleItems({ userId: user.id }, accessToken);
    } catch (err) {
      console.error("[google] account delete cleanup failed:", err);
    }
    await revokeGoogleToken(user.googleRefreshToken);
  }

  const fileUrls = await collectFileUrls({ userId: user.id });
  await prisma.user.delete({ where: { id: user.id } });
  await deleteFiles(fileUrls);

  await deleteSession();
  revalidatePath("/", "layout");
  redirect("/login");
}
