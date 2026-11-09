"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { notifyOwner } from "@/lib/notify";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { CODE_TTL_MS, generateCode, hashCode } from "@/lib/signupCode";
import type { ActionState } from "@/components/ActionForm";

// Stored requests are cheap, so the cap is high; the phone is what needs
// protecting, so pings are throttled separately (see below).
const MAX_PENDING = 200;
const MAX_PINGS_PER_WINDOW = 5;

/**
 * Public. Always answers the same way, so it can't be used to learn which
 * emails already have an account or a pending request.
 */
export async function requestAccess(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@") || email.length > 254) {
    return { error: "Enter a valid email address." };
  }

  try {
    await checkRateLimit(`access-request:${await getClientIp()}`, 3);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Please try again later." };
  }

  const done: ActionState = {
    message: "Request sent. If it is approved, you will receive a code from the site owner.",
  };

  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) return done;

  const existing = await prisma.signupRequest.findUnique({ where: { email } });
  // A request can start over only when its code is gone (expired or locked);
  // anything else is already waiting on the owner or finished.
  const codeGone =
    existing?.status === "approved" &&
    (!existing.codeHash || !existing.expiresAt || existing.expiresAt.getTime() <= Date.now());
  if (existing && !codeGone) return done;

  if ((await prisma.signupRequest.count({ where: { status: "pending" } })) >= MAX_PENDING) {
    return done;
  }

  await prisma.signupRequest.upsert({
    where: { email },
    create: { email },
    update: { status: "pending", codeHash: null, expiresAt: null, attempts: 0 },
  });

  // Global ping budget across all visitors: past it the request is still
  // saved and listed on the admin page, it just doesn't buzz the phone.
  try {
    await checkRateLimit("access-notify", MAX_PINGS_PER_WINDOW);
  } catch {
    return done;
  }

  const base = process.env.APP_URL?.replace(/\/$/, "");
  await notifyOwner(
    `Student Keep: ${email} asked for an account.${base ? `\nApprove: ${base}/admin/requests` : ""}`
  );
  return done;
}

/** Admin only. (Re)issues a fresh single-use code for a request. */
export async function approveRequest(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const req = await prisma.signupRequest.findUnique({ where: { id } });
  if (!req || req.status === "used") return { error: "Request not found." };

  const code = generateCode();
  await prisma.signupRequest.update({
    where: { id },
    data: {
      status: "approved",
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
      attempts: 0,
    },
  });

  revalidatePath("/admin/requests");
  // Only ever shown here, once: the database keeps just the hash.
  return { message: `Code for ${req.email}: ${code} (valid 48 hours, works once)` };
}

/** Admin only. */
export async function deleteRequest(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await prisma.signupRequest.deleteMany({ where: { id } });
  revalidatePath("/admin/requests");
}

/** Admin only. Clears every request still waiting for a decision. */
export async function rejectAllPending() {
  await requireAdmin();
  await prisma.signupRequest.deleteMany({ where: { status: "pending" } });
  revalidatePath("/admin/requests");
}
