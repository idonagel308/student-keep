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

/**
 * Semester progress counts lectures AND homework as one pool of work:
 * a watched lecture and a completed assignment each move the bar by one
 * item. `pct` is done / total over that combined pool.
 */
export function semesterProgress(courses: CourseWithChildren[]) {
  let totalLectures = 0;
  let watched = 0;
  let totalHw = 0;
  let doneHw = 0;
  for (const c of courses) {
    totalLectures += c.lectures.length;
    watched += c.lectures.filter((l) => l.watched).length;
    totalHw += c.homework.length;
    doneHw += c.homework.filter((h) => h.completed).length;
  }
  const totalItems = totalLectures + totalHw;
  const doneItems = watched + doneHw;
  const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
  return {
    courseCount: courses.length,
    totalLectures,
    watched,
    totalHw,
    doneHw,
    totalItems,
    doneItems,
    pct,
  };
}

const LECTURE_GRACE_MS = 24 * 60 * 60 * 1000;

/**
 * Pace for the semester bar. Measures the backlog (due but not done) rather
 * than done − due, so work done early can't hide work that is overdue.
 * A lecture is due one day after it's held; homework at its dueDate. Items
 * with no date are never due.
 */
export function semesterPace(courses: CourseWithChildren[], now: Date) {
  const { totalItems, doneItems } = semesterProgress(courses);
  let due = 0;
  let overdueLectures = 0;
  let overdueHomework = 0;
  for (const c of courses) {
    for (const l of c.lectures) {
      if (!l.scheduledDate || l.scheduledDate.getTime() + LECTURE_GRACE_MS > now.getTime()) continue;
      due++;
      if (!l.watched) overdueLectures++;
    }
    for (const h of c.homework) {
      if (!h.dueDate || h.dueDate > now) continue;
      due++;
      if (!h.completed) overdueHomework++;
    }
  }
  // Done items that aren't due yet: everything done minus the due ones that are done.
  const ahead = doneItems - (due - overdueLectures - overdueHomework);
  return { totalItems, doneItems, due, overdueLectures, overdueHomework, ahead };
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
