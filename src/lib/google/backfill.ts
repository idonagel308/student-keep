import "server-only";

import { prisma } from "@/lib/prisma";
import { createCalendarEvent, createExamEvent } from "@/lib/google/calendar";
import { createTask } from "@/lib/google/tasks";
import { resolveLectureTime } from "@/lib/lectureTime";

export type BackfillResult = {
  created: number;
  failed: number;
  /** The first error seen, so the caller can tell the user why. */
  firstError: unknown;
};

// A handful at a time: much faster than one by one for a semester's worth of
// lectures, while staying well inside Google's per-user rate limits.
const CONCURRENCY = 5;

async function runBatches<T>(
  items: T[],
  work: (item: T) => Promise<void>,
  describe: (item: T) => string
): Promise<BackfillResult> {
  const result: BackfillResult = { created: 0, failed: 0, firstError: null };
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const settled = await Promise.allSettled(items.slice(i, i + CONCURRENCY).map(work));
    settled.forEach((r, j) => {
      if (r.status === "fulfilled") {
        result.created++;
      } else {
        result.failed++;
        result.firstError ??= r.reason;
        console.error(`[google backfill] ${describe(items[i + j])} failed:`, r.reason);
      }
    });
  }
  return result;
}

/**
 * Each backfill creates the Google items that don't exist yet for rows that
 * have a date, and reports what happened. Safe to run repeatedly: rows that
 * already carry a Google id are skipped. A failing row is logged and counted,
 * never fatal to the rest.
 */
export async function backfillLectures(userId: string, accessToken: string): Promise<BackfillResult> {
  const lectures = await prisma.lecture.findMany({
    where: {
      googleEventId: null,
      scheduledDate: { not: null },
      course: { semester: { userId } },
    },
    include: { course: true },
  });

  return runBatches(
    lectures,
    async (lecture) => {
      const time = resolveLectureTime(
        { startTime: lecture.startTime, endTime: lecture.endTime },
        { startTime: lecture.course.lectureStartTime, endTime: lecture.course.lectureEndTime }
      );
      const eventId = await createCalendarEvent(accessToken, {
        courseName: lecture.course.name,
        number: lecture.number,
        title: lecture.title,
        scheduledDate: lecture.scheduledDate!,
        ...time,
      });
      await prisma.lecture.update({ where: { id: lecture.id }, data: { googleEventId: eventId } });
    },
    (lecture) => `lecture ${lecture.id}`
  );
}

export async function backfillHomework(userId: string, accessToken: string): Promise<BackfillResult> {
  const homework = await prisma.homework.findMany({
    where: {
      googleTaskId: null,
      dueDate: { not: null },
      course: { semester: { userId } },
    },
    include: { course: true },
  });

  return runBatches(
    homework,
    async (item) => {
      const taskId = await createTask(accessToken, {
        courseName: item.course.name,
        name: item.name,
        details: item.details,
        dueDate: item.dueDate!,
        completed: item.completed,
      });
      await prisma.homework.update({ where: { id: item.id }, data: { googleTaskId: taskId } });
    },
    (item) => `homework ${item.id}`
  );
}

export async function backfillExamDates(userId: string, accessToken: string): Promise<BackfillResult> {
  const courses = await prisma.course.findMany({
    where: {
      googleExamEventId: null,
      examDate: { not: null },
      semester: { userId },
    },
  });

  return runBatches(
    courses,
    async (course) => {
      const eventId = await createExamEvent(accessToken, {
        courseName: course.name,
        examDate: course.examDate!,
      });
      await prisma.course.update({ where: { id: course.id }, data: { googleExamEventId: eventId } });
    },
    (course) => `exam date for course ${course.id}`
  );
}
