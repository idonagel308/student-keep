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

const PASSING_SCORE = 60;

/**
 * Credits-weighted GPA math, matching the design mock's own `courseStats`:
 * zero-credit courses never enter the average, ungraded courses don't
 * either (not treated as a 0), and "credits earned" only counts courses
 * that passed.
 *
 * A pass-graded course (passGrade, no numeric examScore — e.g. "עובר")
 * counts its credits as earned the same as a numeric grade >= 60 would,
 * but never enters the weighted average — there's no number to weight.
 */
export function gpaStats(
  courses: { credits: number | null; examScore: number | null; passGrade: boolean }[]
) {
  let credits = 0;
  let earned = 0;
  let weightedSum = 0;
  let gradedCredits = 0;

  for (const c of courses) {
    const cr = c.credits ?? 0;
    credits += cr;
    if (cr > 0 && c.passGrade) {
      earned += cr;
    } else if (cr > 0 && c.examScore !== null) {
      weightedSum += c.examScore * cr;
      gradedCredits += cr;
      if (c.examScore >= PASSING_SCORE) earned += cr;
    }
  }

  return {
    credits,
    earned,
    gradedCredits,
    avg: gradedCredits > 0 ? weightedSum / gradedCredits : null,
  };
}
