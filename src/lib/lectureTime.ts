/**
 * Lecture times are stored as plain "HH:MM" strings (24h) next to - not
 * inside - the date columns. scheduledDate is a date-only value that's
 * already interpreted in a few places (display, pace, Google events), and
 * folding a time into it would shift those dates around timezones. A
 * course carries the usual time for all its lectures; an individual
 * lecture can override it (e.g. one session moved to another hour).
 */

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export type TimeRange = {
  startTime: string | null;
  endTime: string | null;
};

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(minutes, 23 * 60 + 59));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Validates a start/end pair from a form. Both blank is valid ("no time").
 * An end time without a start time is rejected, since "ends at 12:00"
 * alone has nothing to anchor an event to.
 */
export function parseTimeRange(startRaw: string, endRaw: string): TimeRange {
  const start = startRaw.trim();
  const end = endRaw.trim();

  if (!start && !end) return { startTime: null, endTime: null };
  if (!start) throw new Error("Enter a start time, or clear the end time too.");
  if (!TIME_RE.test(start)) throw new Error("Start time must look like 09:30.");
  if (!end) return { startTime: start, endTime: null };
  if (!TIME_RE.test(end)) throw new Error("End time must look like 11:15.");
  if (timeToMinutes(end) <= timeToMinutes(start)) {
    throw new Error("End time must be after start time.");
  }
  return { startTime: start, endTime: end };
}

/**
 * The time a lecture actually happens at. A lecture's own start time wins
 * and brings its own end time with it (never mixed with the course's end),
 * otherwise the course's time applies.
 */
export function resolveLectureTime(lecture: TimeRange, course: TimeRange): TimeRange {
  if (lecture.startTime) {
    return { startTime: lecture.startTime, endTime: lecture.endTime };
  }
  return { startTime: course.startTime, endTime: course.endTime };
}

/** "" when there's no time, "10:00" for a start only, "10:00–12:00" for a range. */
export function formatTimeRange(range: TimeRange): string {
  if (!range.startTime) return "";
  return range.endTime ? `${range.startTime}–${range.endTime}` : range.startTime;
}
