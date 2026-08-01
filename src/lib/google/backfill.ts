import "server-only";

import { prisma } from "@/lib/prisma";
import { createCalendarEvent, createExamEvent } from "@/lib/google/calendar";
import { createTask } from "@/lib/google/tasks";

/**
 * Runs once when a sync toggle flips on — walks existing rows that aren't
 * mirrored yet and creates the missing events/tasks. Resilient to partial
 * failure: one bad row is logged and skipped, not fatal to the rest.
 */
export async function backfillLectures(userId: string, accessToken: string): Promise<void> {
  const lectures = await prisma.lecture.findMany({
    where: {
      googleEventId: null,
      scheduledDate: { not: null },
      course: { semester: { userId } },
    },
    include: { course: true },
  });

  for (const lecture of lectures) {
    try {
      const eventId = await createCalendarEvent(accessToken, {
        courseName: lecture.course.name,
        number: lecture.number,
        title: lecture.title,
        scheduledDate: lecture.scheduledDate!,
      });
      await prisma.lecture.update({ where: { id: lecture.id }, data: { googleEventId: eventId } });
    } catch (err) {
      console.error(`[google backfill] lecture ${lecture.id} failed:`, err);
    }
  }
}

export async function backfillHomework(userId: string, accessToken: string): Promise<void> {
  const homework = await prisma.homework.findMany({
    where: {
      googleTaskId: null,
      dueDate: { not: null },
      course: { semester: { userId } },
    },
    include: { course: true },
  });

  for (const item of homework) {
    try {
      const taskId = await createTask(accessToken, {
        courseName: item.course.name,
        name: item.name,
        details: item.details,
        dueDate: item.dueDate!,
        completed: item.completed,
      });
      await prisma.homework.update({ where: { id: item.id }, data: { googleTaskId: taskId } });
    } catch (err) {
      console.error(`[google backfill] homework ${item.id} failed:`, err);
    }
  }
}

export async function backfillExamDates(userId: string, accessToken: string): Promise<void> {
  const courses = await prisma.course.findMany({
    where: {
      googleExamEventId: null,
      examDate: { not: null },
      semester: { userId },
    },
  });

  for (const course of courses) {
    try {
      const eventId = await createExamEvent(accessToken, {
        courseName: course.name,
        examDate: course.examDate!,
      });
      await prisma.course.update({ where: { id: course.id }, data: { googleExamEventId: eventId } });
    } catch (err) {
      console.error(`[google backfill] exam date for course ${course.id} failed:`, err);
    }
  }
}
