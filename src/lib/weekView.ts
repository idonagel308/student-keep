import { startOfDay } from "date-fns";
import type { WeekLectureRow } from "@/components/WeekLectures";
import type { WeekCalendarItem } from "@/lib/weekCalendar";
import { formatTimeRange, resolveLectureTime, timeToMinutes } from "@/lib/lectureTime";

// Only the fields used here, so plain test fixtures and Prisma rows both fit.
type LectureIn = {
  id: string;
  number: number;
  title: string | null;
  watched: boolean;
  scheduledDate: Date | null;
  startTime: string | null;
  endTime: string | null;
};
type HomeworkIn = { id: string; name: string; dueDate: Date | null; completed: boolean };
type CourseIn = {
  id: string;
  name: string;
  color: string | null;
  lectureStartTime: string | null;
  lectureEndTime: string | null;
  lectures: LectureIn[];
  homework: HomeworkIn[];
};
export type SemesterIn = { id: string; name: string; startDate: Date; endDate: Date; courses: CourseIn[] };

export type DueRow = {
  courseId: string;
  courseName: string;
  courseColor: string | null;
  homeworkId: string;
  name: string;
  dueDate: Date;
};

/** What the list renders, plus the start time used only for sorting. */
export type LectureRow = WeekLectureRow & { startTime: string | null };

export type WeekView = {
  /** The semester shown in the subtitle: the most recent one overlapping the week. */
  semester: SemesterIn | null;
  dueRows: DueRow[];
  lectureRows: LectureRow[];
  calendarItems: WeekCalendarItem[];
  overdueCount: number;
};

/**
 * Everything the "This week" page shows for one week.
 *
 * - Homework: not yet done and due inside the week. For the current week,
 *   anything overdue from earlier weeks is included too (listed first), since
 *   that is still on your plate; other weeks show only their own due dates.
 * - Lectures: from every semester that overlaps the week, dated inside it.
 * - Calendar grid: the same rows, limited to the week's seven days.
 *
 * `semesters` must be sorted by start date, newest first.
 */
export function buildWeekView(
  semesters: SemesterIn[],
  opts: {
    weekStart: Date;
    weekEnd: Date;
    isCurrentWeek: boolean;
    now: Date;
    lectureLabel: (number: number) => string;
  }
): WeekView {
  const { weekStart, weekEnd, isCurrentWeek, now, lectureLabel } = opts;
  const inWeek = (d: Date) => d >= weekStart && d <= weekEnd;
  const overlapping = semesters.filter((s) => s.startDate <= weekEnd && s.endDate >= weekStart);

  const dueRows: DueRow[] = [];
  for (const s of semesters) {
    for (const c of s.courses) {
      for (const h of c.homework) {
        if (h.completed || !h.dueDate) continue;
        const belongs = isCurrentWeek ? h.dueDate <= weekEnd : inWeek(h.dueDate);
        if (!belongs) continue;
        dueRows.push({
          courseId: c.id,
          courseName: c.name,
          courseColor: c.color,
          homeworkId: h.id,
          name: h.name,
          dueDate: h.dueDate,
        });
      }
    }
  }
  dueRows.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const today = startOfDay(now);
  const overdueCount = dueRows.filter((r) => r.dueDate < today).length;

  const lectureRows: LectureRow[] = [];
  for (const s of overlapping) {
    for (const c of s.courses) {
      const watchedCount = c.lectures.filter((l) => l.watched).length;
      for (const l of c.lectures) {
        if (!l.scheduledDate || !inWeek(l.scheduledDate)) continue;
        const time = resolveLectureTime(
          { startTime: l.startTime, endTime: l.endTime },
          { startTime: c.lectureStartTime, endTime: c.lectureEndTime }
        );
        lectureRows.push({
          courseId: c.id,
          courseName: c.name,
          courseColor: c.color,
          lectureId: l.id,
          number: l.number,
          title: l.title,
          watched: l.watched,
          scheduledDate: l.scheduledDate,
          startTime: time.startTime,
          timeLabel: formatTimeRange(time),
          watchedCount,
          totalCount: c.lectures.length,
        });
      }
    }
  }
  lectureRows.sort(
    (a, b) =>
      a.scheduledDate.getTime() - b.scheduledDate.getTime() ||
      // Same day: earlier lecture first, lectures with no time last.
      (a.startTime ? timeToMinutes(a.startTime) : Infinity) -
        (b.startTime ? timeToMinutes(b.startTime) : Infinity)
  );

  // Overdue homework from earlier weeks stays in the list above but not in
  // the seven-day grid.
  const calendarItems: WeekCalendarItem[] = [
    ...dueRows
      .filter((r) => inWeek(r.dueDate))
      .map((r) => ({
        id: r.homeworkId,
        type: "homework" as const,
        date: r.dueDate,
        courseName: r.courseName,
        label: r.name,
        href: `/courses/${r.courseId}`,
        color: r.courseColor,
      })),
    ...lectureRows.map((l) => ({
      id: l.lectureId,
      type: "lecture" as const,
      date: l.scheduledDate,
      courseName: l.courseName,
      label: l.title || lectureLabel(l.number),
      time: l.startTime,
      href: `/courses/${l.courseId}`,
      color: l.courseColor,
    })),
  ];

  return { semester: overlapping[0] ?? null, dueRows, lectureRows, calendarItems, overdueCount };
}
