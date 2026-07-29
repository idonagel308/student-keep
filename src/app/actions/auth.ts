"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";

const MIN_PASSWORD_LENGTH = 8;

function normalizeEmail(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

/**
 * Constant-time-ish comparison so the invite code can't be guessed by timing.
 * Not security-critical on its own, but cheap to do correctly.
 */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function signup(formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim() || null;
  const inviteCode = String(formData.get("inviteCode") ?? "");

  const expectedCode = process.env.SIGNUP_INVITE_CODE;
  if (!expectedCode) {
    throw new Error("Signup is not configured. Set SIGNUP_INVITE_CODE.");
  }
  if (!safeEqual(inviteCode, expectedCode)) {
    throw new Error("That invite code is not valid.");
  }

  if (!email || !email.includes("@")) {
    throw new Error("Enter a valid email address.");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("An account with that email already exists.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });

  await createSession(user.id);
  redirect("/");
}

export async function login(formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { email } });

  // Always run a hash comparison so a missing account and a wrong password
  // take a similar amount of time.
  const hash =
    user?.passwordHash ??
    "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
  const ok = await bcrypt.compare(password, hash);

  if (!user || !ok) {
    throw new Error("Incorrect email or password.");
  }

  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
