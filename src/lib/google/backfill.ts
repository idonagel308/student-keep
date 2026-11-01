import "server-only";

import { prisma } from "@/lib/prisma";
import { createCalendarEvent, createExamEvent } from "@/lib/google/calendar";
import { createTask } from "@/lib/google/tasks";
import { resolveLectureTime } from "@/lib/lectureTime";
import { runBatches, type SyncResult } from "@/lib/google/batch";
import { recordLectureSync, recordHomeworkSync, recordExamSync } from "@/lib/google/syncState";

export type BackfillResult = SyncResult;

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
      const input = {
        courseName: lecture.course.name,
        number: lecture.number,
        title: lecture.title,
        scheduledDate: lecture.scheduledDate!,
        ...time,
      };
      const eventId = await createCalendarEvent(accessToken, input);
      await recordLectureSync(lecture.id, eventId, input);
      return "created";
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
      const input = {
        courseName: item.course.name,
        name: item.name,
        details: item.details,
        dueDate: item.dueDate!,
        completed: item.completed,
      };
      const taskId = await createTask(accessToken, input);
      await recordHomeworkSync(item.id, taskId, input);
      return "created";
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
      const input = { courseName: course.name, examDate: course.examDate! };
      const eventId = await createExamEvent(accessToken, input);
      await recordExamSync(course.id, eventId, input);
      return "created";
    },
    (course) => `exam date for course ${course.id}`
  );
}
