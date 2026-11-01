import "server-only";

import { prisma } from "@/lib/prisma";
import type { LectureEventInput, ExamEventInput } from "@/lib/google/calendar";
import type { HomeworkTaskInput } from "@/lib/google/tasks";
import { lectureFingerprint, examFingerprint, taskFingerprint } from "@/lib/google/fingerprint";

/**
 * Every write to Google must be followed by one of these, so the stored id
 * and the fingerprint of what Google now holds are always saved together.
 * If a code path updated Google without recording it, a later Save could
 * wrongly skip an item that Google has out of date.
 */

export function recordLectureSync(lectureId: string, eventId: string, input: LectureEventInput) {
  return prisma.lecture.update({
    where: { id: lectureId },
    data: { googleEventId: eventId, googleSyncHash: lectureFingerprint(input) },
  });
}

export function clearLectureSync(lectureId: string) {
  return prisma.lecture.update({
    where: { id: lectureId },
    data: { googleEventId: null, googleSyncHash: null },
  });
}

export function recordHomeworkSync(homeworkId: string, taskId: string, input: HomeworkTaskInput) {
  return prisma.homework.update({
    where: { id: homeworkId },
    data: { googleTaskId: taskId, googleSyncHash: taskFingerprint(input) },
  });
}

export function clearHomeworkSync(homeworkId: string) {
  return prisma.homework.update({
    where: { id: homeworkId },
    data: { googleTaskId: null, googleSyncHash: null },
  });
}

export function recordExamSync(courseId: string, eventId: string, input: ExamEventInput) {
  return prisma.course.update({
    where: { id: courseId },
    data: { googleExamEventId: eventId, googleExamSyncHash: examFingerprint(input) },
  });
}

export function clearExamSync(courseId: string) {
  return prisma.course.update({
    where: { id: courseId },
    data: { googleExamEventId: null, googleExamSyncHash: null },
  });
}

/**
 * Forgets what Google is known to hold for all of a user's items (the ids
 * stay), so the next Save re-sends everything. Needed whenever Google's side
 * may no longer match the fingerprints: after disconnecting or connecting
 * another account, or when the user asks to re-send everything.
 */
export async function clearSyncHashes(userId: string) {
  await Promise.all([
    prisma.lecture.updateMany({
      where: { course: { semester: { userId } } },
      data: { googleSyncHash: null },
    }),
    prisma.homework.updateMany({
      where: { course: { semester: { userId } } },
      data: { googleSyncHash: null },
    }),
    prisma.course.updateMany({
      where: { semester: { userId } },
      data: { googleExamSyncHash: null },
    }),
  ]);
}
