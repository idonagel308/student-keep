"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import { getValidAccessToken, revokeGoogleToken } from "@/lib/google/auth";
import {
  backfillLectures,
  backfillHomework,
  backfillExamDates,
  type BackfillResult,
} from "@/lib/google/backfill";
import { describeGoogleError } from "@/lib/google/errors";
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
 * Saves which resources sync to Google, then syncs anything that is missing,
 * every time (not only when a box is newly ticked). That matters after a
 * reconnect, when the boxes are still ticked but nothing has been pushed yet.
 * Already-synced rows are skipped, so repeating it is harmless. The result is
 * reported back to the form: Google errors used to be swallowed, which made a
 * failing sync look identical to a working one.
 */
export async function setGoogleSyncPreferences(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  if (!user.googleRefreshToken) return { error: "Connect Google first." };

  const nextLectures = formData.has("syncLectures");
  const nextHomework = formData.has("syncHomework");
  const nextExams = formData.has("syncExams");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      syncLecturesToCalendar: nextLectures,
      syncHomeworkToTasks: nextHomework,
      syncExamsToCalendar: nextExams,
    },
  });
  revalidatePath("/");

  if (!nextLectures && !nextHomework && !nextExams) return { message: "Saved." };

  const jobs: Array<{
    label: string;
    run: (userId: string, token: string) => Promise<BackfillResult>;
  }> = [];
  if (nextLectures) jobs.push({ label: "Lectures", run: backfillLectures });
  if (nextHomework) jobs.push({ label: "Assignments", run: backfillHomework });
  if (nextExams) jobs.push({ label: "Exam dates", run: backfillExamDates });

  try {
    const accessToken = await getValidAccessToken(user);
    if (!accessToken) return { error: "Connect Google first." };

    const lines: string[] = [];
    let firstError: unknown = null;
    let anyFailed = false;
    for (const job of jobs) {
      const r = await job.run(user.id, accessToken);
      if (r.failed > 0) {
        anyFailed = true;
        firstError ??= r.firstError;
        lines.push(`${job.label}: ${r.created} synced, ${r.failed} failed`);
      } else if (r.created > 0) {
        lines.push(`${job.label}: ${r.created} synced`);
      } else {
        lines.push(`${job.label}: already up to date (items need a date to sync)`);
      }
    }

    const summary = lines.join(". ") + ".";
    if (anyFailed) return { error: `${summary} ${describeGoogleError(firstError)}` };
    return { message: summary };
  } catch (err) {
    console.error("[google] sync on save failed:", err);
    return { error: describeGoogleError(err) };
  }
}

/**
 * Clears the connection. Existing googleEventId/googleTaskId values on
 * lectures/homework are left as-is (harmless orphaned references) rather
 * than cleaned up from Google — reconnecting later just mints new ones.
 */
export async function disconnectGoogleCalendar() {
  const user = await requireUser();
  if (user.googleRefreshToken) await revokeGoogleToken(user.googleRefreshToken);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      googleRefreshToken: null,
      googleAccessToken: null,
      googleAccessTokenExpiry: null,
      syncLecturesToCalendar: false,
      syncHomeworkToTasks: false,
      syncExamsToCalendar: false,
    },
  });

  revalidatePath("/");
}
