"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { uploadPdf, deleteBlob } from "@/lib/blob";
import { assertOwnsLecture } from "@/lib/dal";
import type { ActionState } from "@/components/ActionForm";

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

export async function updateLectureTitle(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim() || null;
  if (!id) throw new Error("Missing lecture id.");

  const lecture = await assertOwnsLecture(id);

  await prisma.lecture.update({ where: { id }, data: { title } });
  revalidatePath(`/courses/${lecture.courseId}`);
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
