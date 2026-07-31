export type WeekCalendarItem = {
  id: string;
  type: "lecture" | "homework";
  date: Date;
  label: string;
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
    day.items.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  return days;
}
