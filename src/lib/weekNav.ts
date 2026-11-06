import {
  addWeeks,
  differenceInCalendarWeeks,
  endOfWeek,
  format,
  isValid,
  parse,
  startOfWeek,
} from "date-fns";

// Sunday first, matching the week grid and the "This week" page.
const WEEK_OPTIONS = { weekStartsOn: 0 } as const;
const PARAM_FORMAT = "yyyy-MM-dd";
const PARAM_RE = /^\d{4}-\d{2}-\d{2}$/;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

export type WeekNav = {
  weekStart: Date;
  weekEnd: Date;
  isCurrentWeek: boolean;
  /** Whole weeks from the current week: -1 last week, 0 this week, 1 next week. */
  offset: number;
  /** How to name the week in words, or null to show its dates instead. */
  relative: "this" | "next" | "last" | null;
  prevHref: string;
  nextHref: string;
};

/**
 * Reads the `?week=YYYY-MM-DD` value. Returns null for anything that isn't a
 * real calendar date in a sane range, so a hand-edited or stale URL just shows
 * the current week instead of erroring.
 */
export function parseWeekParam(raw: string | string[] | undefined): Date | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !PARAM_RE.test(value)) return null;
  const date = parse(value, PARAM_FORMAT, new Date());
  if (!isValid(date)) return null;
  const year = date.getFullYear();
  if (year < MIN_YEAR || year > MAX_YEAR) return null;
  return date;
}

/** The link to the week containing `date`: plain "/" for the current week. */
export function weekHref(date: Date, now: Date): string {
  const start = startOfWeek(date, WEEK_OPTIONS);
  if (start.getTime() === startOfWeek(now, WEEK_OPTIONS).getTime()) return "/";
  return `/?week=${format(start, PARAM_FORMAT)}`;
}

/**
 * The week to show and the links around it. Any date inside a week selects
 * that whole week (Sunday to Saturday), so `?week=` doesn't have to be a
 * Sunday.
 */
export function resolveWeek(raw: string | string[] | undefined, now: Date): WeekNav {
  const anchor = parseWeekParam(raw) ?? now;
  const weekStart = startOfWeek(anchor, WEEK_OPTIONS);
  const weekEnd = endOfWeek(anchor, WEEK_OPTIONS);
  const offset = differenceInCalendarWeeks(weekStart, now, WEEK_OPTIONS);
  return {
    weekStart,
    weekEnd,
    isCurrentWeek: offset === 0,
    offset,
    relative: offset === 0 ? "this" : offset === 1 ? "next" : offset === -1 ? "last" : null,
    prevHref: weekHref(addWeeks(weekStart, -1), now),
    nextHref: weekHref(addWeeks(weekStart, 1), now),
  };
}
