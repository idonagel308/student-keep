import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// The __Host- prefix is enforced by the browser itself: it will refuse to
// set the cookie at all unless Secure is set, Path is "/", and no Domain
// attribute is present. That gives a free guarantee against the cookie
// ever being sent over plain HTTP or scoped wider than this exact host.
// (Modern browsers treat http://localhost as a secure context, so this
// doesn't break local dev.)
const SESSION_COOKIE = "__Host-session";
const SESSION_DAYS = 30;

// HS256 needs a secret with enough entropy to resist offline brute force;
// 32 raw bytes is the usual minimum recommendation. This checks encoded
// length as a floor — a base64 32-byte value is 44 chars, so this rejects
// obviously-too-short secrets without trying to decode every possible
// encoding.
const MIN_SESSION_SECRET_LENGTH = 32;

function getKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set.");
  }
  if (secret.length < MIN_SESSION_SECRET_LENGTH) {
    throw new Error(
      `SESSION_SECRET is too short (${secret.length} chars). Generate a real random secret — see .env.example.`
    );
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  tokenVersion: number;
};

export async function encrypt(payload: SessionPayload, expiresAt: Date) {
  return new SignJWT({ userId: payload.userId, tokenVersion: payload.tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getKey());
}

export async function decrypt(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey(), {
      algorithms: ["HS256"],
    });
    const userId = payload.userId;
    const tokenVersion = payload.tokenVersion;
    if (typeof userId !== "string" || typeof tokenVersion !== "number") {
      return null;
    }
    return { userId, tokenVersion };
  } catch {
    // Invalid or expired token.
    return null;
  }
}

export async function createSession(userId: string, tokenVersion: number) {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const token = await encrypt({ userId, tokenVersion }, expiresAt);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return decrypt(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function deleteSession() {
  const cookieStore = await cookies();
  // Not cookieStore.delete(SESSION_COOKIE) — that shorthand builds its
  // Set-Cookie header without a Secure attribute. Browsers require every
  // Set-Cookie for a __Host- prefixed name (including deletions) to
  // include Secure and Path=/ with no Domain, or they silently reject it
  // outright — so .delete() here would leave the original session cookie
  // completely intact. Setting the same attributes used in createSession,
  // just expired, is what actually gets the browser to drop it.
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
  });
}

export { SESSION_COOKIE };
