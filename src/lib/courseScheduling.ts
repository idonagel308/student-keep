/** The first date on or after `start` that falls on `dayOfWeek` (0=Sunday..6=Saturday). */
export function firstOccurrenceOnOrAfter(start: Date, dayOfWeek: number): Date {
  const d = new Date(start);
  const diff = (dayOfWeek - d.getUTCDay() + 7) % 7;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

/**
 * weekIndex 0 lands on `dayOfWeek`'s first occurrence on/after `start` (or
 * on `start` itself when dayOfWeek is unset — the original behavior).
 * Every later index is exactly weekIndex*7 days after that anchor.
 */
export function weeklyDate(start: Date, weekIndex: number, dayOfWeek: number | null = null): Date {
  const anchor = dayOfWeek === null ? start : firstOccurrenceOnOrAfter(start, dayOfWeek);
  const d = new Date(anchor);
  d.setUTCDate(d.getUTCDate() + weekIndex * 7);
  return d;
}

export function parseDayOfWeek(raw: string): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 6) {
    throw new Error("Invalid day of week.");
  }
  return n;
}
