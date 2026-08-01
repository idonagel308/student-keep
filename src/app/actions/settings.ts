"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import { getValidAccessToken } from "@/lib/google/auth";
import { backfillLectures, backfillHomework } from "@/lib/google/backfill";
import type { ActionState } from "@/components/ActionForm";

export async function setLanguage(formData: FormData) {
  const lang = String(formData.get("lang") ?? "en") === "he" ? "he" : "en";

  const store = await cookies();
  store.set("lang", lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  // Language affects every server-rendered page's text, so the whole
  // layout tree needs to be considered stale, not just the current route.
  revalidatePath("/", "layout");
}

function parseCreditsRequired(raw: string): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Credits required must be a non-negative number.");
  }
  return n;
}

export async function setDegreeSettings(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const degreeName = String(formData.get("degreeName") ?? "").trim() || null;
  const creditsRequiredRaw = String(formData.get("creditsRequired") ?? "").trim();

  let creditsRequired: number | null;
  try {
    creditsRequired = parseCreditsRequired(creditsRequiredRaw);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid input." };
  }

  const user = await requireUser();

  await prisma.user.update({
    where: { id: user.id },
    data: { degreeName, creditsRequired },
  });

  revalidatePath("/degree");
  revalidatePath("/");
}

/**
 * Updates which resources sync to Google, and backfills anything already
 * in the app the first time a toggle flips from off to on. Backfill
 * failures are logged, not surfaced — the preference is already saved
 * either way, and sync catches up on the next create/edit regardless.
 */
export async function setGoogleSyncPreferences(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  if (!user.googleRefreshToken) return { error: "Connect Google first." };

  const nextLectures = formData.has("syncLectures");
  const nextHomework = formData.has("syncHomework");

  await prisma.user.update({
    where: { id: user.id },
    data: { syncLecturesToCalendar: nextLectures, syncHomeworkToTasks: nextHomework },
  });

  try {
    const turningLecturesOn = nextLectures && !user.syncLecturesToCalendar;
    const turningHomeworkOn = nextHomework && !user.syncHomeworkToTasks;
    if (turningLecturesOn || turningHomeworkOn) {
      const accessToken = await getValidAccessToken(user);
      if (accessToken) {
        if (turningLecturesOn) await backfillLectures(user.id, accessToken);
        if (turningHomeworkOn) await backfillHomework(user.id, accessToken);
      }
    }
  } catch (err) {
    console.error("[google] backfill on toggle failed:", err);
  }

  revalidatePath("/");
}

/**
 * Clears the connection. Existing googleEventId/googleTaskId values on
 * lectures/homework are left as-is (harmless orphaned references) rather
 * than cleaned up from Google — reconnecting later just mints new ones.
 */
export async function disconnectGoogleCalendar() {
  const user = await requireUser();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      googleRefreshToken: null,
      googleAccessToken: null,
      googleAccessTokenExpiry: null,
      syncLecturesToCalendar: false,
      syncHomeworkToTasks: false,
    },
  });

  revalidatePath("/");
}
