import "server-only";

import { prisma } from "@/lib/prisma";
import { deleteBlob } from "@/lib/blob";
import { deleteCalendarEvent } from "@/lib/google/calendar";
import { deleteTask } from "@/lib/google/tasks";

/**
 * Deleting database rows does not delete the uploaded PDFs they point to
 * (those live in R2/Blob), so every delete that cascades over lectures or
 * homework has to collect the file URLs first and remove the files after the
 * rows are gone. Collecting first means a failed row delete never orphans the
 * other direction (rows pointing at files that no longer exist).
 */
export type CleanupScope = { userId: string } | { semesterId: string } | { courseId: string };

function courseFilter(scope: CleanupScope) {
  if ("userId" in scope) return { semester: { userId: scope.userId } };
  if ("semesterId" in scope) return { semesterId: scope.semesterId };
  return { id: scope.courseId };
}

export async function collectFileUrls(scope: CleanupScope): Promise<string[]> {
  const course = courseFilter(scope);
  const [lectures, homework] = await Promise.all([
    prisma.lecture.findMany({
      where: { course, summaryFileUrl: { not: null } },
      select: { summaryFileUrl: true },
    }),
    prisma.homework.findMany({
      where: {
        course,
        OR: [{ assignmentFileUrl: { not: null } }, { answerFileUrl: { not: null } }],
      },
      select: { assignmentFileUrl: true, answerFileUrl: true },
    }),
  ]);

  const urls: string[] = [];
  for (const l of lectures) if (l.summaryFileUrl) urls.push(l.summaryFileUrl);
  for (const h of homework) {
    if (h.assignmentFileUrl) urls.push(h.assignmentFileUrl);
    if (h.answerFileUrl) urls.push(h.answerFileUrl);
  }
  return urls;
}

/** Best-effort: deleteBlob already ignores missing files. */
export async function deleteFiles(urls: string[]): Promise<void> {
  for (let i = 0; i < urls.length; i += 10) {
    await Promise.all(urls.slice(i, i + 10).map((url) => deleteBlob(url)));
  }
}

/**
 * Removes every Google Calendar event and Google Task this app created
 * within `scope`. Used when a semester or account is deleted so nothing is
 * left behind in the user's Google account. Per-item failures are logged and
 * skipped.
 */
export async function deleteGoogleItems(scope: CleanupScope, accessToken: string): Promise<void> {
  const course = courseFilter(scope);
  const [lectures, homework, courses] = await Promise.all([
    prisma.lecture.findMany({
      where: { googleEventId: { not: null }, course },
      select: { googleEventId: true },
    }),
    prisma.homework.findMany({
      where: { googleTaskId: { not: null }, course },
      select: { googleTaskId: true },
    }),
    prisma.course.findMany({
      where: { googleExamEventId: { not: null }, ...course },
      select: { googleExamEventId: true },
    }),
  ]);

  const jobs: Array<() => Promise<void>> = [];
  for (const l of lectures) jobs.push(() => deleteCalendarEvent(accessToken, l.googleEventId!));
  for (const c of courses) jobs.push(() => deleteCalendarEvent(accessToken, c.googleExamEventId!));
  for (const h of homework) jobs.push(() => deleteTask(accessToken, h.googleTaskId!));

  for (let i = 0; i < jobs.length; i += 10) {
    const results = await Promise.allSettled(jobs.slice(i, i + 10).map((job) => job()));
    for (const r of results) {
      if (r.status === "rejected") console.error("[google] account cleanup item failed:", r.reason);
    }
  }
}
