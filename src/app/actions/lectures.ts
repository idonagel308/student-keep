"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { uploadPdf, deleteBlob } from "@/lib/blob";

export async function toggleLecture(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  if (!id) throw new Error("Missing lecture id.");

  const lecture = await prisma.lecture.findUnique({ where: { id } });
  if (!lecture) throw new Error("Lecture not found.");

  await prisma.lecture.update({
    where: { id },
    data: { watched: !lecture.watched },
  });

  revalidatePath(`/courses/${courseId}`);
}

export async function updateLectureTitle(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const title = String(formData.get("title") ?? "").trim() || null;
  if (!id) throw new Error("Missing lecture id.");

  await prisma.lecture.update({ where: { id }, data: { title } });
  revalidatePath(`/courses/${courseId}`);
}

export async function uploadLectureSummary(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const file = formData.get("file");
  if (!id) throw new Error("Missing lecture id.");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Please choose a PDF file.");
  }

  const existing = await prisma.lecture.findUnique({ where: { id } });
  await deleteBlob(existing?.summaryFileUrl);

  const { url, name } = await uploadPdf(file, `lectures/${id}`);

  await prisma.lecture.update({
    where: { id },
    data: { summaryFileUrl: url, summaryFileName: name },
  });

  revalidatePath(`/courses/${courseId}`);
}

export async function removeLectureSummary(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  if (!id) throw new Error("Missing lecture id.");

  const existing = await prisma.lecture.findUnique({ where: { id } });
  await deleteBlob(existing?.summaryFileUrl);

  await prisma.lecture.update({
    where: { id },
    data: { summaryFileUrl: null, summaryFileName: null },
  });

  revalidatePath(`/courses/${courseId}`);
}
