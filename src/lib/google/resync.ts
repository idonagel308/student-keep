import "server-only";

import { prisma } from "@/lib/prisma";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  createExamEvent,
  updateExamEvent,
} from "@/lib/google/calendar";
import { createTask, updateTask, deleteTask } from "@/lib/google/tasks";
import { resolveLectureTime } from "@/lib/lectureTime";
import { runBatches, type SyncResult } from "@/lib/google/batch";

/**
 * Makes Google match the app. Unlike the create-only backfills, a resync
 * also pushes the current dates to items that already exist in Google (an
 * update that recreates the item if it was deleted there), and removes the
 * Google item when the date was cleared in the app. Safe to run repeatedly.
 * This is what "Save" in Settings runs.
 */

export function resyncLectures(userId: string, accessToken: string): Promise<SyncResult> {
  return prisma.lecture
    .findMany({
      where: {
        course: { semester: { userId } },
        OR: [{ scheduledDate: { not: null } }, { googleEventId: { not: null } }],
      },
      include: { course: true },
    })
    .then((lectures) =>
      runBatches(
        lectures,
        async (l) => {
          if (!l.scheduledDate) {
            await deleteCalendarEvent(accessToken, l.googleEventId!);
            await prisma.lecture.update({ where: { id: l.id }, data: { googleEventId: null } });
            return "removed";
          }
          const time = resolveLectureTime(
            { startTime: l.startTime, endTime: l.endTime },
            { startTime: l.course.lectureStartTime, endTime: l.course.lectureEndTime }
          );
          const input = {
            courseName: l.course.name,
            number: l.number,
            title: l.title,
            scheduledDate: l.scheduledDate,
            ...time,
          };
          if (l.googleEventId) {
            const id = await updateCalendarEvent(accessToken, l.googleEventId, input);
            if (id !== l.googleEventId) {
              await prisma.lecture.update({ where: { id: l.id }, data: { googleEventId: id } });
            }
            return "updated";
          }
          const id = await createCalendarEvent(accessToken, input);
          await prisma.lecture.update({ where: { id: l.id }, data: { googleEventId: id } });
          return "created";
        },
        (l) => `lecture ${l.id}`
      )
    );
}

export function resyncHomework(userId: string, accessToken: string): Promise<SyncResult> {
  return prisma.homework
    .findMany({
      where: {
        course: { semester: { userId } },
        OR: [{ dueDate: { not: null } }, { googleTaskId: { not: null } }],
      },
      include: { course: true },
    })
    .then((items) =>
      runBatches(
        items,
        async (h) => {
          if (!h.dueDate) {
            await deleteTask(accessToken, h.googleTaskId!);
            await prisma.homework.update({ where: { id: h.id }, data: { googleTaskId: null } });
            return "removed";
          }
          const input = {
            courseName: h.course.name,
            name: h.name,
            details: h.details,
            dueDate: h.dueDate,
            completed: h.completed,
          };
          if (h.googleTaskId) {
            const id = await updateTask(accessToken, h.googleTaskId, input);
            if (id !== h.googleTaskId) {
              await prisma.homework.update({ where: { id: h.id }, data: { googleTaskId: id } });
            }
            return "updated";
          }
          const id = await createTask(accessToken, input);
          await prisma.homework.update({ where: { id: h.id }, data: { googleTaskId: id } });
          return "created";
        },
        (h) => `homework ${h.id}`
      )
    );
}

export function resyncExamDates(userId: string, accessToken: string): Promise<SyncResult> {
  return prisma.course
    .findMany({
      where: {
        semester: { userId },
        OR: [{ examDate: { not: null } }, { googleExamEventId: { not: null } }],
      },
    })
    .then((courses) =>
      runBatches(
        courses,
        async (c) => {
          if (!c.examDate) {
            await deleteCalendarEvent(accessToken, c.googleExamEventId!);
            await prisma.course.update({ where: { id: c.id }, data: { googleExamEventId: null } });
            return "removed";
          }
          const input = { courseName: c.name, examDate: c.examDate };
          if (c.googleExamEventId) {
            const id = await updateExamEvent(accessToken, c.googleExamEventId, input);
            if (id !== c.googleExamEventId) {
              await prisma.course.update({ where: { id: c.id }, data: { googleExamEventId: id } });
            }
            return "updated";
          }
          const id = await createExamEvent(accessToken, input);
          await prisma.course.update({ where: { id: c.id }, data: { googleExamEventId: id } });
          return "created";
        },
        (c) => `exam date for course ${c.id}`
      )
    );
}
