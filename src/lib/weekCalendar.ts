import { timeToMinutes } from "./lectureTime";

export type WeekCalendarItem = {
  id: string;
  type: "lecture" | "homework";
  date: Date;
  label: string;
  /** Optional "HH:MM" start time - used to order a day's items and shown on the chip. */
  time?: string | null;
  href: string;
  color: string | null;
};

export type WeekCalendarDay = {
  date: Date;
  items: WeekCalendarItem[];
};

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Buckets items into the 7 calendar days starting at `weekStart`. Items
 * outside that range (e.g. overdue homework from a prior week, already
 * shown separately) are silently dropped — this is purely a this-week view.
 */
export function buildWeekDays(weekStart: Date, items: WeekCalendarItem[]): WeekCalendarDay[] {
  const days: WeekCalendarDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return { date, items: [] };
  });

  for (const item of items) {
    const day = days.find((d) => sameCalendarDay(d.date, item.date));
    day?.items.push(item);
  }

  for (const day of days) {
    day.items.sort(
      (a, b) =>
        a.date.getTime() - b.date.getTime() ||
        // Same day: timed items in clock order, untimed items (homework
        // due dates, lectures with no time) after them.
        (a.time ? timeToMinutes(a.time) : Infinity) - (b.time ? timeToMinutes(b.time) : Infinity)
    );
  }

  return days;
}
