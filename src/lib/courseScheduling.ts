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
