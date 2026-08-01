import { describe, it, expect } from "vitest";
import { buildEventBody } from "./calendar";

describe("buildEventBody", () => {
  it("uses an all-day date range with an exclusive end date", () => {
    const body = buildEventBody({
      courseName: "Calc 2",
      number: 5,
      title: null,
      scheduledDate: new Date("2026-08-01T00:00:00Z"),
    });
    expect(body.start).toEqual({ date: "2026-08-01" });
    expect(body.end).toEqual({ date: "2026-08-02" });
  });

  it("omits the title suffix when the lecture has no title", () => {
    const body = buildEventBody({
      courseName: "Calc 2",
      number: 5,
      title: null,
      scheduledDate: new Date("2026-08-01T00:00:00Z"),
    });
    expect(body.summary).toBe("Calc 2: Lecture 5");
  });

  it("includes the title when set", () => {
    const body = buildEventBody({
      courseName: "Calc 2",
      number: 5,
      title: "Integration by parts",
      scheduledDate: new Date("2026-08-01T00:00:00Z"),
    });
    expect(body.summary).toBe("Calc 2: Lecture 5 - Integration by parts");
  });

  it("rolls the exclusive end date over a month boundary correctly", () => {
    const body = buildEventBody({
      courseName: "Calc 2",
      number: 1,
      title: null,
      scheduledDate: new Date("2026-08-31T00:00:00Z"),
    });
    expect(body.start).toEqual({ date: "2026-08-31" });
    expect(body.end).toEqual({ date: "2026-09-01" });
  });
});
