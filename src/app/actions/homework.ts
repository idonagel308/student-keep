"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { uploadPdf, deleteBlob } from "@/lib/blob";
import { assertOwnsCourse, assertOwnsHomework, requireUser } from "@/lib/dal";
import { MAX_NAME_LENGTH, MAX_NOTES_LENGTH, checkLength } from "@/lib/inputLimits";
import { getValidAccessToken } from "@/lib/google/auth";
import { recordHomeworkSync, clearHomeworkSync } from "@/lib/google/syncState";
import { createTask, updateTask, deleteTask } from "@/lib/google/tasks";
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
    checkLength(name, MAX_NAME_LENGTH, "Assignment name");
    checkLength(details, MAX_NOTES_LENGTH, "Details");
    checkLength(answerText, MAX_NOTES_LENGTH, "Answer");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid due date." };
  }

  const user = await requireUser();
  const course = await assertOwnsCourse(courseId);

  let assignment, answer;
  try {
    assignment = await maybeUpload(formData, "assignmentFile", `homework/${courseId}`);
    answer = await maybeUpload(formData, "answerFile", `homework/${courseId}`);
  } catch (err) {
    await deleteBlob(assignment?.url); // don't strand the first upload
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }

  const created = await prisma.homework.create({
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

  if (dueDate && user.googleRefreshToken && user.syncHomeworkToTasks) {
    try {
      const accessToken = await getValidAccessToken(user);
      if (accessToken) {
        const input = { courseName: course.name, name, details, dueDate, completed: false };
        const taskId = await createTask(accessToken, input);
        await recordHomeworkSync(created.id, taskId, input);
      }
    } catch (err) {
      console.error("[google] homework sync failed:", err);
    }
  }

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
    checkLength(name, MAX_NAME_LENGTH, "Assignment name");
    checkLength(details, MAX_NOTES_LENGTH, "Details");
    checkLength(answerText, MAX_NOTES_LENGTH, "Answer");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid due date." };
  }

  const existing = await assertOwnsHomework(id);
  const user = await requireUser();

  let newAssignment, newAnswer;
  try {
    newAssignment = await maybeUpload(formData, "assignmentFile", `homework/${existing.courseId}`);
    newAnswer = await maybeUpload(formData, "answerFile", `homework/${existing.courseId}`);
  } catch (err) {
    await deleteBlob(newAssignment?.url); // don't strand the first upload
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }

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
  // Only after the row points at the new files: a failed update must not
  // leave it pointing at deleted ones.
  if (newAssignment) await deleteBlob(existing.assignmentFileUrl);
  if (newAnswer) await deleteBlob(existing.answerFileUrl);

  // Three cases, same shape as lecture date sync: due date newly set ->
  // create, still set -> update the existing task, cleared -> delete it.
  if (user.googleRefreshToken && user.syncHomeworkToTasks) {
    try {
      const accessToken = await getValidAccessToken(user);
      if (accessToken) {
        if (dueDate) {
          const course = await prisma.course.findUniqueOrThrow({ where: { id: existing.courseId } });
          const input = {
            courseName: course.name,
            name,
            details,
            dueDate,
            completed: existing.completed,
          };
          const taskId = existing.googleTaskId
            ? await updateTask(accessToken, existing.googleTaskId, input)
            : await createTask(accessToken, input);
          await recordHomeworkSync(id, taskId, input);
        } else if (existing.googleTaskId) {
          await deleteTask(accessToken, existing.googleTaskId);
          await clearHomeworkSync(id);
        }
      }
    } catch (err) {
      console.error("[google] homework sync failed:", err);
    }
  }

  revalidatePath(`/courses/${existing.courseId}`);
  revalidatePath("/");
}

export async function toggleHomework(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing homework id.");

  const existing = await assertOwnsHomework(id);
  const nextCompleted = !existing.completed;

  await prisma.homework.update({
    where: { id },
    data: { completed: nextCompleted },
  });

  // The one place completion state syncs — a task's checkbox in Google
  // Tasks mirrors the app's "done" toggle.
  if (existing.googleTaskId && existing.dueDate) {
    const user = await requireUser();
    if (user.googleRefreshToken && user.syncHomeworkToTasks) {
      try {
        const accessToken = await getValidAccessToken(user);
        if (accessToken) {
          const course = await prisma.course.findUniqueOrThrow({ where: { id: existing.courseId } });
          const input = {
            courseName: course.name,
            name: existing.name,
            details: existing.details,
            dueDate: existing.dueDate,
            completed: nextCompleted,
          };
          const taskId = await updateTask(accessToken, existing.googleTaskId, input);
          await recordHomeworkSync(id, taskId, input);
        }
      } catch (err) {
        console.error("[google] homework completion sync failed:", err);
      }
    }
  }

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

  if (existing.googleTaskId) {
    const user = await requireUser();
    if (user.googleRefreshToken) {
      try {
        const accessToken = await getValidAccessToken(user);
        if (accessToken) await deleteTask(accessToken, existing.googleTaskId);
      } catch (err) {
        console.error("[google] homework task cleanup failed:", err);
      }
    }
  }

  await prisma.homework.delete({ where: { id } });
  revalidatePath(`/courses/${existing.courseId}`);
  revalidatePath("/");
}
