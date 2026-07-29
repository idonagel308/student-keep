"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { uploadPdf, deleteBlob } from "@/lib/blob";

async function maybeUpload(formData: FormData, field: string, prefix: string) {
  const file = formData.get(field);
  if (file instanceof File && file.size > 0) {
    return uploadPdf(file, prefix);
  }
  return null;
}

export async function createHomework(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim() || null;
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const answerText = String(formData.get("answerText") ?? "").trim() || null;

  if (!courseId || !name) throw new Error("Assignment name is required.");

  const assignment = await maybeUpload(formData, "assignmentFile", `homework/${courseId}`);
  const answer = await maybeUpload(formData, "answerFile", `homework/${courseId}`);

  await prisma.homework.create({
    data: {
      courseId,
      name,
      details,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      answerText,
      assignmentFileUrl: assignment?.url ?? null,
      assignmentFileName: assignment?.name ?? null,
      answerFileUrl: answer?.url ?? null,
      answerFileName: answer?.name ?? null,
    },
  });

  revalidatePath(`/courses/${courseId}`);
}

export async function updateHomework(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim() || null;
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const answerText = String(formData.get("answerText") ?? "").trim() || null;

  if (!id || !name) throw new Error("Assignment name is required.");

  const existing = await prisma.homework.findUnique({ where: { id } });
  if (!existing) throw new Error("Homework not found.");

  const newAssignment = await maybeUpload(formData, "assignmentFile", `homework/${courseId}`);
  const newAnswer = await maybeUpload(formData, "answerFile", `homework/${courseId}`);

  if (newAssignment) await deleteBlob(existing.assignmentFileUrl);
  if (newAnswer) await deleteBlob(existing.answerFileUrl);

  await prisma.homework.update({
    where: { id },
    data: {
      name,
      details,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      answerText,
      ...(newAssignment
        ? { assignmentFileUrl: newAssignment.url, assignmentFileName: newAssignment.name }
        : {}),
      ...(newAnswer
        ? { answerFileUrl: newAnswer.url, answerFileName: newAnswer.name }
        : {}),
    },
  });

  revalidatePath(`/courses/${courseId}`);
}

export async function toggleHomework(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  if (!id) throw new Error("Missing homework id.");

  const existing = await prisma.homework.findUnique({ where: { id } });
  if (!existing) throw new Error("Homework not found.");

  await prisma.homework.update({
    where: { id },
    data: { completed: !existing.completed },
  });

  revalidatePath(`/courses/${courseId}`);
}

export async function removeHomeworkFile(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const which = String(formData.get("which") ?? "");
  if (!id) throw new Error("Missing homework id.");

  const existing = await prisma.homework.findUnique({ where: { id } });
  if (!existing) throw new Error("Homework not found.");

  if (which === "assignment") {
    await deleteBlob(existing.assignmentFileUrl);
    await prisma.homework.update({
      where: { id },
      data: { assignmentFileUrl: null, assignmentFileName: null },
    });
  } else if (which === "answer") {
    await deleteBlob(existing.answerFileUrl);
    await prisma.homework.update({
      where: { id },
      data: { answerFileUrl: null, answerFileName: null },
    });
  }

  revalidatePath(`/courses/${courseId}`);
}

export async function deleteHomework(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  if (!id) throw new Error("Missing homework id.");

  const existing = await prisma.homework.findUnique({ where: { id } });
  if (existing) {
    await deleteBlob(existing.assignmentFileUrl);
    await deleteBlob(existing.answerFileUrl);
  }

  await prisma.homework.delete({ where: { id } });
  revalidatePath(`/courses/${courseId}`);
}
