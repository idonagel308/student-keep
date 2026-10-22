import { afterEach, describe, it, expect, vi } from "vitest";
import { buildEventBody, buildExamEventBody, toPatchBody, updateCalendarEvent } from "./calendar";

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

describe("buildExamEventBody", () => {
  it("uses an all-day date range with an exclusive end date", () => {
    const body = buildExamEventBody({
      courseName: "Calc 2",
      examDate: new Date("2026-09-14T00:00:00Z"),
    });
    expect(body.start).toEqual({ date: "2026-09-14" });
    expect(body.end).toEqual({ date: "2026-09-15" });
  });

  it("labels the event as a final exam", () => {
    const body = buildExamEventBody({
      courseName: "Calc 2",
      examDate: new Date("2026-09-14T00:00:00Z"),
    });
    expect(body.summary).toBe("Calc 2: Final exam");
  });
});

describe("buildEventBody with a lecture time", () => {
  const base = {
    courseName: "Calc 2",
    number: 5,
    title: null,
    scheduledDate: new Date("2026-08-01T00:00:00Z"),
  };

  it("builds a timed event in the configured timezone", () => {
    const body = buildEventBody({ ...base, startTime: "10:00", endTime: "12:30" });
    expect(body.start).toEqual({ dateTime: "2026-08-01T10:00:00", timeZone: "Asia/Jerusalem" });
    expect(body.end).toEqual({ dateTime: "2026-08-01T12:30:00", timeZone: "Asia/Jerusalem" });
  });

  it("defaults to a one hour event when there is a start but no end", () => {
    const body = buildEventBody({ ...base, startTime: "09:15", endTime: null });
    expect(body.end).toEqual({ dateTime: "2026-08-01T10:15:00", timeZone: "Asia/Jerusalem" });
  });

  it("never runs a default-length event past the end of the day", () => {
    const body = buildEventBody({ ...base, startTime: "23:30", endTime: null });
    expect(body.end.dateTime).toBe("2026-08-01T23:59:00");
  });

  it("stays all-day when there is no start time", () => {
    const body = buildEventBody({ ...base, startTime: null, endTime: "12:00" });
    expect(body.start).toEqual({ date: "2026-08-01" });
    expect(body.end).toEqual({ date: "2026-08-02" });
  });

  it("keeps the summary the same with or without a time", () => {
    expect(buildEventBody({ ...base, startTime: "10:00" }).summary).toBe("Calc 2: Lecture 5");
  });
});

describe("toPatchBody", () => {
  it("clears the all-day fields when an event becomes timed", () => {
    const patched = toPatchBody(
      buildEventBody({
        courseName: "Calc 2",
        number: 1,
        title: null,
        scheduledDate: new Date("2026-08-01T00:00:00Z"),
        startTime: "10:00",
        endTime: "12:00",
      })
    );
    expect(patched.start.date).toBeNull();
    expect(patched.end.date).toBeNull();
    expect(patched.start.dateTime).toBe("2026-08-01T10:00:00");
  });

  it("clears the timed fields when an event goes back to all-day", () => {
    const patched = toPatchBody(
      buildEventBody({
        courseName: "Calc 2",
        number: 1,
        title: null,
        scheduledDate: new Date("2026-08-01T00:00:00Z"),
      })
    );
    expect(patched.start).toEqual({ date: "2026-08-01", dateTime: null, timeZone: null });
    expect(patched.end).toEqual({ date: "2026-08-02", dateTime: null, timeZone: null });
  });
});

describe("updateCalendarEvent self-healing", () => {
  const input = {
    courseName: "Algorithms",
    number: 2,
    title: null,
    scheduledDate: new Date("2026-08-01T00:00:00Z"),
  };

  afterEach(() => vi.unstubAllGlobals());

  it("keeps the id when the patch succeeds", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(updateCalendarEvent("tok", "evt1", input)).resolves.toBe("evt1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("recreates the event and returns the new id when Google says 404", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("gone", { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "evt2" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(updateCalendarEvent("tok", "evt1", input)).resolves.toBe("evt2");
    expect(fetchMock.mock.calls[1][1].method).toBe("POST");
  });

  it("still throws on other errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 403 })));
    await expect(updateCalendarEvent("tok", "evt1", input)).rejects.toThrow(/403/);
  });
});
