import { describe, it, expect } from "vitest";
import {
  parseTimeRange,
  resolveLectureTime,
  formatTimeRange,
  timeToMinutes,
  minutesToTime,
} from "./lectureTime";

describe("parseTimeRange", () => {
  it("treats both blank as no time", () => {
    expect(parseTimeRange("", "")).toEqual({ startTime: null, endTime: null });
    expect(parseTimeRange("  ", " ")).toEqual({ startTime: null, endTime: null });
  });

  it("accepts a start with no end", () => {
    expect(parseTimeRange("09:30", "")).toEqual({ startTime: "09:30", endTime: null });
  });

  it("accepts a valid range", () => {
    expect(parseTimeRange("10:00", "12:15")).toEqual({ startTime: "10:00", endTime: "12:15" });
  });

  it("rejects an end time with no start time", () => {
    expect(() => parseTimeRange("", "12:00")).toThrow("Enter a start time");
  });

  it("rejects malformed times", () => {
    expect(() => parseTimeRange("9:30", "")).toThrow("Start time must look like 09:30.");
    expect(() => parseTimeRange("24:00", "")).toThrow("Start time must look like 09:30.");
    expect(() => parseTimeRange("10:60", "")).toThrow("Start time must look like 09:30.");
    expect(() => parseTimeRange("10:00", "noon")).toThrow("End time must look like 11:15.");
  });

  it("rejects an end time that is not after the start", () => {
    expect(() => parseTimeRange("10:00", "10:00")).toThrow("End time must be after start time.");
    expect(() => parseTimeRange("10:00", "09:00")).toThrow("End time must be after start time.");
  });
});

describe("resolveLectureTime", () => {
  const course = { startTime: "10:00", endTime: "12:00" };

  it("falls back to the course time when the lecture has none", () => {
    expect(resolveLectureTime({ startTime: null, endTime: null }, course)).toEqual(course);
  });

  it("uses the lecture's own time when it has one", () => {
    expect(resolveLectureTime({ startTime: "14:00", endTime: "16:00" }, course)).toEqual({
      startTime: "14:00",
      endTime: "16:00",
    });
  });

  it("does not mix a lecture start with the course end", () => {
    expect(resolveLectureTime({ startTime: "14:00", endTime: null }, course)).toEqual({
      startTime: "14:00",
      endTime: null,
    });
  });

  it("returns no time when neither side has one", () => {
    const none = { startTime: null, endTime: null };
    expect(resolveLectureTime(none, none)).toEqual(none);
  });
});

describe("formatTimeRange", () => {
  it("formats the three shapes", () => {
    expect(formatTimeRange({ startTime: null, endTime: null })).toBe("");
    expect(formatTimeRange({ startTime: "09:30", endTime: null })).toBe("09:30");
    expect(formatTimeRange({ startTime: "10:00", endTime: "12:00" })).toBe("10:00–12:00");
  });
});

describe("time/minute conversion", () => {
  it("round-trips", () => {
    expect(timeToMinutes("09:30")).toBe(570);
    expect(minutesToTime(570)).toBe("09:30");
  });

  it("clamps to the same day", () => {
    expect(minutesToTime(24 * 60 + 30)).toBe("23:59");
    expect(minutesToTime(-5)).toBe("00:00");
  });
});
