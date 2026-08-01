"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertOwnsCourse, assertOwnsSemester, requireUser } from "@/lib/dal";
import { weeklyDate, parseDayOfWeek } from "@/lib/courseScheduling";
import { getValidAccessToken } from "@/lib/google/auth";
import { backfillLectures } from "@/lib/google/backfill";
import { deleteCalendarEvent } from "@/lib/google/calendar";
import { deleteTask } from "@/lib/google/tasks";
import type { ActionState } from "@/components/ActionForm";

// A real course won't have more lectures than this; the cap exists so a
// bogus value can't allocate an unbounded array (Array.from({length: n}))
// or write an unbounded number of rows in one request.
const MAX_LECTURES = 500;

function parseCredits(raw: string): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Credits must be a non-negative number.");
  }
  return n;
}

function parseExamScore(raw: string): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new Error("Grade must be a number between 0 and 100.");
  }
  return n;
}

type GoogleUser = {
  id: string;
  googleRefreshToken: string | null;
  googleAccessToken: string | null;
  googleAccessTokenExpiry: Date | null;
  syncLecturesToCalendar: boolean;
};

/**
 * Every calendar/task call here is deliberately swallowed on failure —
 * sync is a nice-to-have layered on top of the actual feature (tracking
 * courses/lectures). The core save must succeed regardless of whether
 * Google's API is reachable, the token is stale, or access was revoked.
 */
async function syncNewLecturesIfEnabled(user: GoogleUser) {
  if (!user.googleRefreshToken || !user.syncLecturesToCalendar) return;
  try {
    const accessToken = await getValidAccessToken(user);
    if (accessToken) await backfillLectures(user.id, accessToken);
  } catch (err) {
    console.error("[google] lecture sync failed:", err);
  }
}

export async function createCourse(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const semesterId = String(formData.get("semesterId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const courseNumber = String(formData.get("courseNumber") ?? "").trim() || null;
  const totalLectures = Number(formData.get("totalLectures") ?? 0);
  const creditsRaw = String(formData.get("credits") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim() || null;
  const dayOfWeekRaw = String(formData.get("dayOfWeek") ?? "").trim();

  if (!semesterId || !name) {
    return { error: "Course name is required." };
  }
  if (!Number.isFinite(totalLectures) || totalLectures < 0 || totalLectures > MAX_LECTURES) {
    return { error: `Total lectures must be between 0 and ${MAX_LECTURES}.` };
  }

  let credits: number | null;
  let dayOfWeek: number | null;
  try {
    credits = parseCredits(creditsRaw);
    dayOfWeek = parseDayOfWeek(dayOfWeekRaw);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid input." };
  }

  const user = await requireUser();
  const semester = await assertOwnsSemester(semesterId);

  await prisma.course.create({
    data: {
      semesterId,
      name,
      courseNumber,
      totalLectures: Math.floor(totalLectures),
      credits,
      color,
      dayOfWeek,
      lectures: {
        create: Array.from({ length: Math.floor(totalLectures) }, (_, i) => ({
          number: i + 1,
          scheduledDate: weeklyDate(semester.startDate, i, dayOfWeek),
        })),
      },
    },
  });

  await syncNewLecturesIfEnabled(user);

  revalidatePath("/");
  revalidatePath("/semesters");
  revalidatePath(`/semesters/${semesterId}`);
}

export async function updateCourse(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const semesterId = String(formData.get("semesterId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const courseNumber = String(formData.get("courseNumber") ?? "").trim() || null;
  const totalLectures = Number(formData.get("totalLectures") ?? 0);
  const creditsRaw = String(formData.get("credits") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim() || null;
  const dayOfWeekRaw = String(formData.get("dayOfWeek") ?? "").trim();

  if (!id || !name) return { error: "Course name is required." };
  if (!Number.isFinite(totalLectures) || totalLectures < 0 || totalLectures > MAX_LECTURES) {
    return { error: `Total lectures must be between 0 and ${MAX_LECTURES}.` };
  }

  let credits: number | null;
  let dayOfWeek: number | null;
  try {
    credits = parseCredits(creditsRaw);
    dayOfWeek = parseDayOfWeek(dayOfWeekRaw);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid input." };
  }

  const user = await requireUser();
  await assertOwnsCourse(id);

  const target = Math.floor(totalLectures);

  const existing = await prisma.lecture.findMany({
    where: { courseId: id },
    orderBy: { number: "asc" },
  });
  const currentCount = existing.length;

  if (target > currentCount) {
    // Continue the weekly cadence from the last existing lecture's date
    // (rather than re-basing from the semester start), so extending a
    // course doesn't reshuffle dates that may already be hand-edited. Only
    // when there's no existing lecture to anchor to does the day-of-week
    // picker come into play — from there, +7 days each time preserves
    // whatever weekday was already set.
    const last = existing[existing.length - 1];
    const anchor = last?.scheduledDate ?? (await assertOwnsSemester(semesterId)).startDate;
    const anchorWeekOffset = last?.scheduledDate ? 1 : 0;
    const anchorDayOfWeek = last?.scheduledDate ? null : dayOfWeek;

    await prisma.lecture.createMany({
      data: Array.from({ length: target - currentCount }, (_, i) => ({
        courseId: id,
        number: currentCount + i + 1,
        scheduledDate: weeklyDate(anchor, i + anchorWeekOffset, anchorDayOfWeek),
      })),
    });

    await syncNewLecturesIfEnabled(user);
  } else if (target < currentCount) {
    // Remove the highest-numbered lectures beyond the new total.
    const toRemove = existing.slice(target);

    if (user.googleRefreshToken && user.syncLecturesToCalendar) {
      try {
        const accessToken = await getValidAccessToken(user);
        if (accessToken) {
          for (const lecture of toRemove) {
            if (lecture.googleEventId) await deleteCalendarEvent(accessToken, lecture.googleEventId);
          }
        }
      } catch (err) {
        console.error("[google] lecture event cleanup failed:", err);
      }
    }

    await prisma.lecture.deleteMany({ where: { id: { in: toRemove.map((l) => l.id) } } });
  }

  await prisma.course.update({
    where: { id },
    data: {
      name,
      courseNumber,
      totalLectures: target,
      credits,
      color,
      dayOfWeek,
    },
  });

  revalidatePath("/");
  revalidatePath("/semesters");
  revalidatePath(`/semesters/${semesterId}`);
  revalidatePath(`/courses/${id}`);
}

/** Sets or clears a course's final grade. Separate from updateCourse so
 * editing the course's other details never accidentally wipes the grade. */
export async function setCourseGrade(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const gradeMode = String(formData.get("gradeMode") ?? "score");
  const examScoreRaw = String(formData.get("examScore") ?? "").trim();
  if (!id) return { error: "Missing course id." };

  const passGrade = gradeMode === "pass";

  let examScore: number | null;
  try {
    examScore = passGrade ? null : parseExamScore(examScoreRaw);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid grade." };
  }

  const course = await assertOwnsCourse(id);

  await prisma.course.update({ where: { id }, data: { examScore, passGrade } });

  revalidatePath("/");
  revalidatePath("/semesters");
  revalidatePath(`/semesters/${course.semesterId}`);
  revalidatePath(`/courses/${id}`);
  revalidatePath("/degree");
}

export async function deleteCourse(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const semesterId = String(formData.get("semesterId") ?? "");
  if (!id) throw new Error("Missing course id.");

  const user = await requireUser();
  await assertOwnsCourse(id);

  if (user.googleRefreshToken && (user.syncLecturesToCalendar || user.syncHomeworkToTasks)) {
    try {
      const accessToken = await getValidAccessToken(user);
      if (accessToken) {
        const [lectures, homework] = await Promise.all([
          prisma.lecture.findMany({ where: { courseId: id, googleEventId: { not: null } } }),
          prisma.homework.findMany({ where: { courseId: id, googleTaskId: { not: null } } }),
        ]);
        for (const lecture of lectures) {
          if (lecture.googleEventId) await deleteCalendarEvent(accessToken, lecture.googleEventId);
        }
        for (const item of homework) {
          if (item.googleTaskId) await deleteTask(accessToken, item.googleTaskId);
        }
      }
    } catch (err) {
      console.error("[google] course delete cleanup failed:", err);
    }
  }

  await prisma.course.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/semesters");
  revalidatePath(`/semesters/${semesterId}`);
  redirect(`/semesters/${semesterId}`);
}
