import { afterEach, describe, expect, it } from "vitest";
import { examFingerprint, lectureFingerprint, taskFingerprint } from "./fingerprint";

const lecture = {
  courseName: "Algorithms",
  number: 3,
  title: "Graphs",
  scheduledDate: new Date("2026-11-04T12:00:00Z"),
  startTime: "10:00",
  endTime: "12:00",
};
const task = {
  courseName: "Algorithms",
  name: "Problem set",
  details: null,
  dueDate: new Date("2026-11-10T12:00:00Z"),
  completed: false,
};

describe("fingerprints", () => {
  const savedTz = process.env.GOOGLE_EVENT_TIMEZONE;
  afterEach(() => {
    if (savedTz === undefined) delete process.env.GOOGLE_EVENT_TIMEZONE;
    else process.env.GOOGLE_EVENT_TIMEZONE = savedTz;
  });

  it("is stable for the same content", () => {
    expect(lectureFingerprint({ ...lecture })).toBe(lectureFingerprint({ ...lecture }));
    expect(taskFingerprint({ ...task })).toBe(taskFingerprint({ ...task }));
  });

  it("changes when anything sent to Google changes", () => {
    const base = lectureFingerprint(lecture);
    expect(lectureFingerprint({ ...lecture, scheduledDate: new Date("2026-11-05T12:00:00Z") })).not.toBe(base);
    expect(lectureFingerprint({ ...lecture, title: "Trees" })).not.toBe(base);
    expect(lectureFingerprint({ ...lecture, courseName: "Data Structures" })).not.toBe(base);
    expect(lectureFingerprint({ ...lecture, startTime: "11:00", endTime: "13:00" })).not.toBe(base);
    expect(lectureFingerprint({ ...lecture, startTime: null, endTime: null })).not.toBe(base);
  });

  it("changes when a task is completed or its due date moves", () => {
    const base = taskFingerprint(task);
    expect(taskFingerprint({ ...task, completed: true })).not.toBe(base);
    expect(taskFingerprint({ ...task, dueDate: new Date("2026-11-11T12:00:00Z") })).not.toBe(base);
    expect(taskFingerprint({ ...task, details: "Chapter 4" })).not.toBe(base);
  });

  it("changes when the event time zone setting changes", () => {
    delete process.env.GOOGLE_EVENT_TIMEZONE;
    const before = lectureFingerprint(lecture);
    process.env.GOOGLE_EVENT_TIMEZONE = "Europe/London";
    expect(lectureFingerprint(lecture)).not.toBe(before);
  });

  it("tracks the exam date", () => {
    const a = examFingerprint({ courseName: "Algorithms", examDate: new Date("2027-01-20T12:00:00Z") });
    const b = examFingerprint({ courseName: "Algorithms", examDate: new Date("2027-01-21T12:00:00Z") });
    expect(a).not.toBe(b);
  });
});
