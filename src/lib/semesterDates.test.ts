import { describe, it, expect } from "vitest";
import { parseSemesterDates } from "./semesterDates";

describe("parseSemesterDates", () => {
  it("accepts a normal range where end is after start", () => {
    const { startDate, endDate } = parseSemesterDates("2026-08-01", "2026-09-14");
    expect(startDate.getTime()).toBeLessThan(endDate.getTime());
  });

  it("rejects an end date before the start date", () => {
    expect(() => parseSemesterDates("2026-09-14", "2026-07-30")).toThrow(
      "End date must be after start date."
    );
  });

  it("rejects an end date equal to the start date", () => {
    expect(() => parseSemesterDates("2026-08-01", "2026-08-01")).toThrow(
      "End date must be after start date."
    );
  });

  it("rejects an invalid start date", () => {
    expect(() => parseSemesterDates("not-a-date", "2026-09-14")).toThrow(
      "Start date is not a valid date."
    );
  });

  it("rejects an invalid end date", () => {
    expect(() => parseSemesterDates("2026-08-01", "not-a-date")).toThrow(
      "End date is not a valid date."
    );
  });
});
