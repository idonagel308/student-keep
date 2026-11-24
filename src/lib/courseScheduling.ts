/** The first date on or after `start` that falls on `dayOfWeek` (0=Sunday..6=Saturday). */
export function firstOccurrenceOnOrAfter(start: Date, dayOfWeek: number): Date {
  const d = new Date(start);
  const diff = (dayOfWeek - d.getUTCDay() + 7) % 7;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

/**
 * Index 0 lands on `dayOfWeek`'s first occurrence on/after `start` (or on
 * `start` itself when dayOfWeek is unset — the original behavior). Every
 * later lecture is `intervalWeeks` weeks after the previous one: a lecture
 * every week (1, the default) or every two weeks (2).
 */
export function weeklyDate(
  start: Date,
  weekIndex: number,
  dayOfWeek: number | null = null,
  intervalWeeks: number = 1
): Date {
  const anchor = dayOfWeek === null ? start : firstOccurrenceOnOrAfter(start, dayOfWeek);
  const d = new Date(anchor);
  d.setUTCDate(d.getUTCDate() + weekIndex * 7 * intervalWeeks);
  return d;
}

/** Only "every week" (1) or "every two weeks" (2) exist; blank means the default, 1. */
export function parseLectureInterval(raw: string): 1 | 2 {
  const value = raw.trim();
  if (value === "" || value === "1") return 1;
  if (value === "2") return 2;
  throw new Error("Lectures can meet every week or every two weeks.");
}

export function parseDayOfWeek(raw: string): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 6) {
    throw new Error("Invalid day of week.");
  }
  return n;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A cancelled class: lecture `from` and every later one take the next one's
 * date; the last moves one class slot (`intervalWeeks` weeks) further.
 * `dates` are the course's lecture dates in lecture-number order.
 */
export function shiftForCancel(dates: Date[], from: number, intervalWeeks: number): Date[] {
  return dates.map((d, i) => {
    if (i < from) return d;
    if (i + 1 < dates.length) return dates[i + 1];
    return new Date(d.getTime() + 7 * intervalWeeks * DAY_MS);
  });
}

/**
 * A make-up class on `makeup` (any day): the first lecture dated after it
 * moves onto it and each later one takes the previous one's date, so numbers
 * keep following the calendar. Returns null when no lecture is after it.
 */
export function shiftForMakeup(dates: Date[], makeup: Date): { dates: Date[]; index: number } | null {
  const index = dates.findIndex((d) => d.getTime() > makeup.getTime());
  if (index === -1) return null;
  return {
    index,
    dates: dates.map((d, i) => (i < index ? d : i === index ? makeup : dates[i - 1])),
  };
}
