import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/**
 * The authorization boundary for the whole app.
 *
 * Proxy (proxy.ts) only does an optimistic cookie check — it cannot be trusted
 * for authorization. Every read or write of user data must go through one of
 * the helpers below so ownership is verified against the session on the server.
 */

/** Current user, or null. Cached per-request so repeated calls are free. */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      tokenVersion: true,
      degreeName: true,
      creditsRequired: true,
    },
  });

  // Session referencing a deleted user, or a token issued before the
  // user's tokenVersion was last bumped (see session.ts) — both cases
  // should behave like "not logged in".
  if (!user || user.tokenVersion !== session.tokenVersion) return null;

  const { tokenVersion: _tokenVersion, ...publicUser } = user;
  return publicUser;
});

/** Current user, or redirect to login. Use in pages and actions. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** A semester the current user owns, or null. */
export async function getOwnedSemester(semesterId: string) {
  const user = await requireUser();
  return prisma.semester.findFirst({
    where: { id: semesterId, userId: user.id },
  });
}

/**
 * A course the current user owns, or null.
 * Ownership is inherited through the parent semester.
 */
export async function getOwnedCourse(courseId: string) {
  const user = await requireUser();
  return prisma.course.findFirst({
    where: { id: courseId, semester: { userId: user.id } },
  });
}

/** Asserts ownership of a course, throwing if it is not the user's. */
export async function assertOwnsCourse(courseId: string) {
  const course = await getOwnedCourse(courseId);
  if (!course) throw new Error("Not found.");
  return course;
}

/** Asserts ownership of a semester, throwing if it is not the user's. */
export async function assertOwnsSemester(semesterId: string) {
  const semester = await getOwnedSemester(semesterId);
  if (!semester) throw new Error("Not found.");
  return semester;
}

/** Asserts ownership of a lecture via course -> semester -> user. */
export async function assertOwnsLecture(lectureId: string) {
  const user = await requireUser();
  const lecture = await prisma.lecture.findFirst({
    where: { id: lectureId, course: { semester: { userId: user.id } } },
  });
  if (!lecture) throw new Error("Not found.");
  return lecture;
}

/** Asserts ownership of a homework item via course -> semester -> user. */
export async function assertOwnsHomework(homeworkId: string) {
  const user = await requireUser();
  const homework = await prisma.homework.findFirst({
    where: { id: homeworkId, course: { semester: { userId: user.id } } },
  });
  if (!homework) throw new Error("Not found.");
  return homework;
}

/**
 * True if the current user owns the blob served at this pathname.
 *
 * Checks the *exact* stored URL against the DB rather than parsing the path
 * for an owner id. This is deliberate: any check that infers ownership from
 * path segments and then uses a *different* string (the raw path, which may
 * contain "..", encoded separators, etc.) to actually fetch the blob is a
 * check/use mismatch. Comparing the exact URL closes that gap entirely,
 * since a manipulated path will simply never match a stored column value.
 */
export async function canReadBlobPath(pathname: string) {
  const user = await getCurrentUser();
  if (!user) return false;

  const url = `/api/files/${pathname}`;

  const [lectureCount, homeworkCount] = await Promise.all([
    prisma.lecture.count({
      where: { summaryFileUrl: url, course: { semester: { userId: user.id } } },
    }),
    prisma.homework.count({
      where: {
        OR: [{ assignmentFileUrl: url }, { answerFileUrl: url }],
        course: { semester: { userId: user.id } },
      },
    }),
  ]);

  return lectureCount > 0 || homeworkCount > 0;
}
