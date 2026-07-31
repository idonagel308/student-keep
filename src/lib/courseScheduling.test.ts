import { describe, it, expect } from "vitest";
import { weeklyDate, firstOccurrenceOnOrAfter } from "./courseScheduling";

describe("firstOccurrenceOnOrAfter", () => {
  it("returns the same date when it already falls on the target weekday", () => {
    const wed = new Date(Date.UTC(2026, 6, 29)); // Wed Jul 29 2026
    expect(firstOccurrenceOnOrAfter(wed, 3).getUTCDate()).toBe(29);
  });

  it("advances to the next occurrence when start is before the target weekday", () => {
    const mon = new Date(Date.UTC(2026, 6, 27)); // Mon Jul 27 2026
    const result = firstOccurrenceOnOrAfter(mon, 3); // next Wednesday
    expect(result.getUTCDate()).toBe(29);
  });

  it("wraps to the following week when start is after the target weekday", () => {
    const fri = new Date(Date.UTC(2026, 6, 31)); // Fri Jul 31 2026
    const result = firstOccurrenceOnOrAfter(fri, 1); // next Monday
    expect(result.getUTCDate()).toBe(3); // Aug 3
  });
});

describe("weeklyDate", () => {
  it("falls back to the original start-date-based behavior when dayOfWeek is null", () => {
    const start = new Date(Date.UTC(2026, 6, 5)); // Sun Jul 5 2026
    expect(weeklyDate(start, 0).getUTCDate()).toBe(5);
    expect(weeklyDate(start, 1).getUTCDate()).toBe(12);
    expect(weeklyDate(start, 2).getUTCDate()).toBe(19);
  });

  it("anchors week 0 to the day-of-week's first occurrence, then repeats weekly", () => {
    const semesterStart = new Date(Date.UTC(2026, 6, 5)); // Sun Jul 5 2026
    // Course actually meets on Wednesdays.
    const week0 = weeklyDate(semesterStart, 0, 3);
    const week1 = weeklyDate(semesterStart, 1, 3);
    expect(week0.getUTCDate()).toBe(8); // first Wed on/after Jul 5
    expect(week0.getUTCDay()).toBe(3);
    expect(week1.getUTCDate()).toBe(15);
    expect(week1.getUTCDay()).toBe(3);
  });
});
