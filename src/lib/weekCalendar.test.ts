import { describe, it, expect } from "vitest";
import { buildWeekDays, type WeekCalendarItem } from "./weekCalendar";

function item(overrides: Partial<WeekCalendarItem>): WeekCalendarItem {
  return {
    id: "1",
    type: "lecture",
    date: new Date(2026, 6, 27),
    label: "Test",
    href: "/courses/1",
    color: null,
    ...overrides,
  };
}

describe("buildWeekDays", () => {
  const weekStart = new Date(2026, 6, 27); // Monday, Jul 27 2026

  it("returns 7 consecutive days starting at weekStart", () => {
    const days = buildWeekDays(weekStart, []);
    expect(days).toHaveLength(7);
    expect(days[0].date.getDate()).toBe(27);
    expect(days[6].date.getDate()).toBe(2); // Aug 2
  });

  it("buckets an item into the day matching its calendar date", () => {
    const days = buildWeekDays(weekStart, [item({ id: "a", date: new Date(2026, 6, 29) })]);
    expect(days[0].items).toHaveLength(0);
    expect(days[2].items).toHaveLength(1); // Wed Jul 29
    expect(days[2].items[0].id).toBe("a");
  });

  it("ignores an item outside the 7-day window", () => {
    const days = buildWeekDays(weekStart, [item({ id: "old", date: new Date(2026, 6, 20) })]);
    expect(days.every((d) => d.items.length === 0)).toBe(true);
  });

  it("keeps multiple items on the same day, sorted by time", () => {
    const late = item({ id: "late", date: new Date(2026, 6, 29, 18, 0) });
    const early = item({ id: "early", date: new Date(2026, 6, 29, 8, 0) });
    const days = buildWeekDays(weekStart, [late, early]);
    expect(days[2].items.map((i) => i.id)).toEqual(["early", "late"]);
  });

  it("handles a heavy day (3 homework + 1 lecture) without dropping any", () => {
    const wed = new Date(2026, 6, 29);
    const items = [
      item({ id: "l1", type: "lecture", date: wed }),
      item({ id: "h1", type: "homework", date: wed }),
      item({ id: "h2", type: "homework", date: wed }),
      item({ id: "h3", type: "homework", date: wed }),
    ];
    const days = buildWeekDays(weekStart, items);
    expect(days[2].items).toHaveLength(4);
  });
});
