"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { uploadPdf, deleteBlob } from "@/lib/blob";
import { assertOwnsCourse, assertOwnsHomework } from "@/lib/dal";
import type { ActionState } from "@/components/ActionForm";

async function maybeUpload(formData: FormData, field: string, prefix: string) {
  const file = formData.get(field);
  if (file instanceof File && file.size > 0) {
    return uploadPdf(file, prefix);
  }
  return null;
}

function parseDueDate(raw: string): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Due date is not valid.");
  }
  return d;
}

export async function createHomework(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const courseId = String(formData.get("courseId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim() || null;
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const answerText = String(formData.get("answerText") ?? "").trim() || null;

  if (!courseId || !name) return { error: "Assignment name is required." };

  let dueDate: Date | null;
  try {
    dueDate = parseDueDate(dueDateRaw);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid due date." };
  }

  await assertOwnsCourse(courseId);

  let assignment, answer;
  try {
    assignment = await maybeUpload(formData, "assignmentFile", `homework/${courseId}`);
    answer = await maybeUpload(formData, "answerFile", `homework/${courseId}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }

  await prisma.homework.create({
    data: {
      courseId,
      name,
      details,
      dueDate,
      answerText,
      assignmentFileUrl: assignment?.url ?? null,
      assignmentFileName: assignment?.name ?? null,
      answerFileUrl: answer?.url ?? null,
      answerFileName: answer?.name ?? null,
    },
  });

  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/");
}

export async function updateHomework(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim() || null;
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const answerText = String(formData.get("answerText") ?? "").trim() || null;

  if (!id || !name) return { error: "Assignment name is required." };

  let dueDate: Date | null;
  try {
    dueDate = parseDueDate(dueDateRaw);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid due date." };
  }

  const existing = await assertOwnsHomework(id);

  let newAssignment, newAnswer;
  try {
    newAssignment = await maybeUpload(formData, "assignmentFile", `homework/${existing.courseId}`);
    newAnswer = await maybeUpload(formData, "answerFile", `homework/${existing.courseId}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }

  if (newAssignment) await deleteBlob(existing.assignmentFileUrl);
  if (newAnswer) await deleteBlob(existing.answerFileUrl);

  await prisma.homework.update({
    where: { id },
    data: {
      name,
      details,
      dueDate,
      answerText,
      ...(newAssignment
        ? { assignmentFileUrl: newAssignment.url, assignmentFileName: newAssignment.name }
        : {}),
      ...(newAnswer
        ? { answerFileUrl: newAnswer.url, answerFileName: newAnswer.name }
        : {}),
    },
  });

  revalidatePath(`/courses/${existing.courseId}`);
  revalidatePath("/");
}

export async function toggleHomework(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing homework id.");

  const existing = await assertOwnsHomework(id);

  await prisma.homework.update({
    where: { id },
    data: { completed: !existing.completed },
  });

  revalidatePath(`/courses/${existing.courseId}`);
  revalidatePath("/");
}

export async function removeHomeworkFile(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const which = String(formData.get("which") ?? "");
  if (!id) throw new Error("Missing homework id.");

  const existing = await assertOwnsHomework(id);

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

  revalidatePath(`/courses/${existing.courseId}`);
  revalidatePath("/");
}

export async function deleteHomework(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing homework id.");

  const existing = await assertOwnsHomework(id);
  await deleteBlob(existing.assignmentFileUrl);
  await deleteBlob(existing.answerFileUrl);

  await prisma.homework.delete({ where: { id } });
  revalidatePath(`/courses/${existing.courseId}`);
  revalidatePath("/");
}
