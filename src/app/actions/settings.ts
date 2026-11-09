"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import { MAX_NAME_LENGTH, checkLength, parseCreditValue } from "@/lib/inputLimits";
import { getValidAccessToken, revokeGoogleToken } from "@/lib/google/auth";
import { resyncLectures, resyncHomework, resyncExamDates } from "@/lib/google/resync";
import { describeSyncResult, type SyncResult } from "@/lib/google/batch";
import { describeGoogleError } from "@/lib/google/errors";
import { clearSyncHashes } from "@/lib/google/syncState";
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
  return parseCreditValue(raw, "Credits required");
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
    checkLength(degreeName, MAX_NAME_LENGTH, "Degree name");
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
 * Saves which resources sync to Google, then makes Google match the app for
 * each ticked resource, every time (not only when a box is newly ticked):
 * missing items are added, existing ones get the current dates, and items
 * whose date was cleared are removed. Repeating it is harmless. The result is
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
  // "Re-send everything": forget what Google is known to hold so every item
  // is sent again (e.g. after events were deleted by hand in Google).
  const force = formData.has("force");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      syncLecturesToCalendar: nextLectures,
      syncHomeworkToTasks: nextHomework,
      syncExamsToCalendar: nextExams,
    },
  });
  revalidatePath("/");
  if (force) await clearSyncHashes(user.id);

  if (!nextLectures && !nextHomework && !nextExams) return { message: "Saved." };

  const jobs: Array<{
    label: string;
    run: (userId: string, token: string) => Promise<SyncResult>;
  }> = [];
  if (nextLectures) jobs.push({ label: "Lectures", run: resyncLectures });
  if (nextHomework) jobs.push({ label: "Assignments", run: resyncHomework });
  if (nextExams) jobs.push({ label: "Exam dates", run: resyncExamDates });

  try {
    const accessToken = await getValidAccessToken(user);
    if (!accessToken) return { error: "Connect Google first." };

    const lines: string[] = [];
    let firstError: unknown = null;
    for (const job of jobs) {
      const r = await job.run(user.id, accessToken);
      firstError ??= r.firstError;
      lines.push(describeSyncResult(job.label, r));
    }

    const summary = lines.join(". ") + ".";
    if (firstError) return { error: `${summary} ${describeGoogleError(firstError)}` };
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
  // A later connection may be to a different Google account, so nothing can
  // be assumed to still exist there.
  await clearSyncHashes(user.id);

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
