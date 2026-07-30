"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { uploadPdf, deleteBlob } from "@/lib/blob";
import { assertOwnsLecture, assertOwnsCourse } from "@/lib/dal";
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

  await prisma.lecture.update({ where: { id }, data: { title, scheduledDate } });
  revalidatePath(`/courses/${lecture.courseId}`);
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

  await assertOwnsCourse(courseId);

  const lectures = await prisma.lecture.findMany({
    where: { courseId },
    orderBy: { number: "asc" },
  });

  await prisma.$transaction(
    lectures.map((l, i) => {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i * 7);
      return prisma.lecture.update({ where: { id: l.id }, data: { scheduledDate: d } });
    })
  );

  revalidatePath(`/courses/${courseId}`);
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
