"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { uploadPdf, deleteBlob } from "@/lib/blob";
import { assertOwnsLecture, assertOwnsCourse, requireUser } from "@/lib/dal";
import { getValidAccessToken } from "@/lib/google/auth";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "@/lib/google/calendar";
import type { ActionState } from "@/components/ActionForm";

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const d = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date.");
  return d;
}

export async function toggleLecture(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing lecture id.");

  const lecture = await assertOwnsLecture(id);

  await prisma.lecture.update({
    where: { id },
    data: { watched: !lecture.watched },
  });

  // Use the courseId from the ownership-checked record, not the form's —
  // the form value is client-supplied and only feeds a cache-revalidation
  // path here, but trusting it on principle invites copy-paste mistakes
  // where it later gets used for something that matters.
  revalidatePath(`/courses/${lecture.courseId}`);
  revalidatePath("/");
}

export async function updateLecture(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim() || null;
  const dateRaw = String(formData.get("scheduledDate") ?? "").trim();
  if (!id) return { error: "Missing lecture id." };

  let scheduledDate: Date | null;
  try {
    scheduledDate = parseDate(dateRaw);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid date." };
  }

  const lecture = await assertOwnsLecture(id);
  const user = await requireUser();

  await prisma.lecture.update({ where: { id }, data: { title, scheduledDate } });

  // Three cases, same shape as homework's due-date sync: date newly set ->
  // create, date still set -> update the existing event, date cleared ->
  // delete it. Swallowed on failure — sync is layered on top of the save,
  // never blocks it.
  if (user.googleRefreshToken && user.syncLecturesToCalendar) {
    try {
      const accessToken = await getValidAccessToken(user);
      if (accessToken) {
        if (scheduledDate) {
          const course = await prisma.course.findUniqueOrThrow({ where: { id: lecture.courseId } });
          const input = { courseName: course.name, number: lecture.number, title, scheduledDate };
          if (lecture.googleEventId) {
            await updateCalendarEvent(accessToken, lecture.googleEventId, input);
          } else {
            const eventId = await createCalendarEvent(accessToken, input);
            await prisma.lecture.update({ where: { id }, data: { googleEventId: eventId } });
          }
        } else if (lecture.googleEventId) {
          await deleteCalendarEvent(accessToken, lecture.googleEventId);
          await prisma.lecture.update({ where: { id }, data: { googleEventId: null } });
        }
      }
    } catch (err) {
      console.error("[google] lecture sync failed:", err);
    }
  }

  revalidatePath(`/courses/${lecture.courseId}`);
  revalidatePath("/");
}

/**
 * Resets every lecture in a course to a clean weekly cadence starting from
 * `startDate` — a manual "un-stick" for when hand-edited dates drift, not
 * the primary scheduling mechanism (that happens automatically on course
 * create/extend in courses.ts).
 */
export async function scheduleLecturesWeekly(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const startDateRaw = String(formData.get("startDate") ?? "");
  if (!courseId || !startDateRaw) throw new Error("Missing course id or start date.");

  const start = new Date(`${startDateRaw}T12:00:00`);
  if (Number.isNaN(start.getTime())) throw new Error("Invalid date.");

  const user = await requireUser();
  const course = await assertOwnsCourse(courseId);

  const lectures = await prisma.lecture.findMany({
    where: { courseId },
    orderBy: { number: "asc" },
  });

  const dates = lectures.map((_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i * 7);
    return d;
  });

  await prisma.$transaction(
    lectures.map((l, i) => prisma.lecture.update({ where: { id: l.id }, data: { scheduledDate: dates[i] } }))
  );

  if (user.googleRefreshToken && user.syncLecturesToCalendar) {
    try {
      const accessToken = await getValidAccessToken(user);
      if (accessToken) {
        for (let i = 0; i < lectures.length; i++) {
          const l = lectures[i];
          const input = { courseName: course.name, number: l.number, title: l.title, scheduledDate: dates[i] };
          if (l.googleEventId) {
            await updateCalendarEvent(accessToken, l.googleEventId, input);
          } else {
            const eventId = await createCalendarEvent(accessToken, input);
            await prisma.lecture.update({ where: { id: l.id }, data: { googleEventId: eventId } });
          }
        }
      }
    } catch (err) {
      console.error("[google] weekly reschedule sync failed:", err);
    }
  }

  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/");
}

export async function uploadLectureSummary(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const file = formData.get("file");
  if (!id) throw new Error("Missing lecture id.");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a PDF file." };
  }

  const existing = await assertOwnsLecture(id);

  let uploaded;
  try {
    uploaded = await uploadPdf(file, `lectures/${id}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }

  await deleteBlob(existing.summaryFileUrl);

  await prisma.lecture.update({
    where: { id },
    data: { summaryFileUrl: uploaded.url, summaryFileName: uploaded.name },
  });

  revalidatePath(`/courses/${existing.courseId}`);
}

export async function removeLectureSummary(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing lecture id.");

  const existing = await assertOwnsLecture(id);
  await deleteBlob(existing.summaryFileUrl);

  await prisma.lecture.update({
    where: { id },
    data: { summaryFileUrl: null, summaryFileName: null },
  });

  revalidatePath(`/courses/${existing.courseId}`);
}
