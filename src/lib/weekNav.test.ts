import { afterEach, describe, expect, it } from "vitest";
import { format } from "date-fns";
import { parseWeekParam, resolveWeek, weekHref } from "./weekNav";

// Wednesday Nov 11 2026, mid-afternoon. Its week is Sun Nov 8 - Sat Nov 14.
const NOW = new Date(2026, 10, 11, 15, 30);
const day = (d: Date) => format(d, "yyyy-MM-dd");
const paramOf = (href: string) => new URL(href, "http://x").searchParams.get("week") ?? undefined;

describe("resolveWeek", () => {
  it("shows the current week when there is no ?week=", () => {
    const nav = resolveWeek(undefined, NOW);
    expect(day(nav.weekStart)).toBe("2026-11-08");
    expect(day(nav.weekEnd)).toBe("2026-11-14");
    expect(nav.weekEnd.getHours()).toBe(23); // end of Saturday, so Saturday items count
    expect(nav.isCurrentWeek).toBe(true);
    expect(nav.offset).toBe(0);
    expect(nav.prevHref).toBe("/?week=2026-11-01");
    expect(nav.nextHref).toBe("/?week=2026-11-15");
  });

  it("shows next week, and its 'previous' link goes back to plain /", () => {
    const nav = resolveWeek("2026-11-15", NOW);
    expect(day(nav.weekStart)).toBe("2026-11-15");
    expect(nav.isCurrentWeek).toBe(false);
    expect(nav.offset).toBe(1);
    expect(nav.prevHref).toBe("/");
    expect(nav.nextHref).toBe("/?week=2026-11-22");
  });

  it("shows previous weeks with a negative offset", () => {
    const nav = resolveWeek("2026-10-04", NOW);
    expect(nav.offset).toBe(-5);
    expect(nav.isCurrentWeek).toBe(false);
  });

  it("treats any day of a week as that whole week", () => {
    const nav = resolveWeek("2026-11-18", NOW); // a Wednesday
    expect(day(nav.weekStart)).toBe("2026-11-15");
    expect(day(nav.weekEnd)).toBe("2026-11-21");
  });

  it("recognises the current week given explicitly", () => {
    expect(resolveWeek("2026-11-08", NOW).isCurrentWeek).toBe(true);
    expect(resolveWeek("2026-11-14", NOW).isCurrentWeek).toBe(true);
  });

  it("crosses the year boundary", () => {
    const nav = resolveWeek("2026-12-30", NOW);
    expect(day(nav.weekStart)).toBe("2026-12-27");
    expect(day(nav.weekEnd)).toBe("2027-01-02");
    expect(nav.prevHref).toBe("/?week=2026-12-20");
    expect(nav.nextHref).toBe("/?week=2027-01-03");
  });

  it("returns to the current week after going forward and back the same number of times", () => {
    let href = "/";
    for (let i = 0; i < 10; i++) href = resolveWeek(paramOf(href), NOW).nextHref;
    expect(href).toBe("/?week=2027-01-17");
    for (let i = 0; i < 10; i++) href = resolveWeek(paramOf(href), NOW).prevHref;
    expect(href).toBe("/");
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["not a date", "abc"],
    ["month 13", "2026-13-01"],
    ["Feb 30", "2026-02-30"],
    ["no zero padding", "2026-1-5"],
    ["too old", "1999-12-31"],
    ["too far ahead", "2101-01-02"],
    ["trailing junk", "2026-11-15<script>"],
  ])("falls back to the current week for a bad value (%s)", (_label, raw) => {
    const nav = resolveWeek(raw, NOW);
    expect(day(nav.weekStart)).toBe("2026-11-08");
    expect(nav.isCurrentWeek).toBe(true);
  });

  it("uses the first value when ?week= is repeated", () => {
    expect(day(resolveWeek(["2026-11-15", "2027-01-01"], NOW).weekStart)).toBe("2026-11-15");
  });
});

describe("parseWeekParam / weekHref", () => {
  it("parses a real date", () => {
    expect(day(parseWeekParam("2026-11-15")!)).toBe("2026-11-15");
  });

  it("links the current week as plain /", () => {
    expect(weekHref(new Date(2026, 10, 13), NOW)).toBe("/");
    expect(weekHref(new Date(2026, 10, 19), NOW)).toBe("/?week=2026-11-15");
  });
});

describe("daylight saving time", () => {
  const savedTz = process.env.TZ;
  afterEach(() => {
    if (savedTz === undefined) delete process.env.TZ;
    else process.env.TZ = savedTz;
  });

  it.each([
    // Israel's clocks go back on Sun Oct 25 2026; the US's on Sun Nov 1 2026.
    ["Asia/Jerusalem", "2026-10-25", "2026-10-18", "2026-11-01"],
    ["America/New_York", "2026-11-01", "2026-10-25", "2026-11-08"],
  ])("keeps whole Sunday-to-Saturday weeks across a clock change (%s)", (tz, week, prev, next) => {
    process.env.TZ = tz;
    const now = new Date(2026, 5, 15, 12); // far from both weeks
    const nav = resolveWeek(week, now);
    expect(day(nav.weekStart)).toBe(week);
    expect(nav.prevHref).toBe(`/?week=${prev}`);
    expect(nav.nextHref).toBe(`/?week=${next}`);
  });
});
