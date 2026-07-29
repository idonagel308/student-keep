import type { Course, Lecture, Homework } from "@/generated/prisma/client";

export type CourseWithChildren = Course & {
  lectures: Lecture[];
  homework: Homework[];
};

export function courseProgress(course: CourseWithChildren) {
  const totalLectures = course.lectures.length;
  const watched = course.lectures.filter((l) => l.watched).length;
  const totalHw = course.homework.length;
  const doneHw = course.homework.filter((h) => h.completed).length;
  return { totalLectures, watched, totalHw, doneHw };
}

export function semesterProgress(courses: CourseWithChildren[]) {
  let totalLectures = 0;
  let watched = 0;
  for (const c of courses) {
    totalLectures += c.lectures.length;
    watched += c.lectures.filter((l) => l.watched).length;
  }
  const lecturePct =
    totalLectures > 0 ? Math.round((watched / totalLectures) * 100) : 0;
  return { courseCount: courses.length, totalLectures, watched, lecturePct };
}
