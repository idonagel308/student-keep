import { describe, expect, it } from "vitest";
import { format } from "date-fns";
import { buildWeekView, type SemesterIn } from "./weekView";
import { resolveWeek } from "./weekNav";

// Wednesday Nov 11 2026; "this week" is Sun Nov 8 - Sat Nov 14.
const NOW = new Date(2026, 10, 11, 12, 0);
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day, 12, 0);

function lecture(id: string, number: number, date: Date | null, extra: Partial<SemesterIn["courses"][number]["lectures"][number]> = {}) {
  return { id, number, title: null, watched: false, scheduledDate: date, startTime: null, endTime: null, ...extra };
}
function homework(id: string, dueDate: Date | null, completed = false) {
  return { id, name: id, dueDate, completed };
}
function course(id: string, extra: Partial<SemesterIn["courses"][number]>) {
  return { id, name: id, color: null, lectureStartTime: null, lectureEndTime: null, lectures: [], homework: [], ...extra };
}

// Newest first, as the page loads them.
const SEMESTERS: SemesterIn[] = [
  {
    id: "winter",
    name: "Winter 2027",
    startDate: d(2027, 1, 6), // a Wednesday, overlapping Fall's last week
    endDate: d(2027, 4, 30),
    courses: [course("calculus", { lectures: [lecture("calc-1", 1, d(2027, 1, 7))] })],
  },
  {
    id: "fall",
    name: "Fall 2026",
    startDate: d(2026, 10, 1),
    endDate: d(2027, 1, 9),
    courses: [
      course("algebra", {
        lectureStartTime: "10:00",
        lectureEndTime: "12:00",
        lectures: [
          lecture("alg-3", 3, d(2026, 11, 2), { watched: true }),
          lecture("alg-4", 4, d(2026, 11, 9)),
          lecture("alg-5", 5, d(2026, 11, 16), { title: "Eigenvalues" }),
          lecture("alg-6", 6, null),
          lecture("alg-last", 12, d(2027, 1, 4)),
        ],
        homework: [
          homework("hw-overdue", d(2026, 11, 3)),
          homework("hw-done", d(2026, 11, 12), true),
          homework("hw-this-week", d(2026, 11, 13)),
          homework("hw-next-week", d(2026, 11, 18)),
          homework("hw-no-date", null),
        ],
      }),
      course("economics", {
        lectureStartTime: "14:00",
        lectures: [lecture("eco-early", 2, d(2026, 11, 9), { startTime: "08:00" })],
      }),
    ],
  },
  {
    id: "spring",
    name: "Spring 2026",
    startDate: d(2026, 3, 1),
    endDate: d(2026, 7, 31),
    courses: [course("history", { homework: [homework("hw-spring-forgotten", d(2026, 6, 1))] })],
  },
];

function viewFor(week: string | undefined) {
  const nav = resolveWeek(week, NOW);
  return buildWeekView(SEMESTERS, { ...nav, now: NOW, lectureLabel: (n) => `Lecture ${n}` });
}
const ids = (rows: { homeworkId?: string; lectureId?: string }[]) => rows.map((r) => r.homeworkId ?? r.lectureId);

describe("buildWeekView: this week", () => {
  const v = viewFor(undefined);

  it("lists unfinished homework due this week plus anything still overdue, oldest first", () => {
    expect(ids(v.dueRows)).toEqual(["hw-spring-forgotten", "hw-overdue", "hw-this-week"]);
    expect(v.overdueCount).toBe(2);
  });

  it("never lists completed or undated homework", () => {
    expect(ids(v.dueRows)).not.toContain("hw-done");
    expect(ids(v.dueRows)).not.toContain("hw-no-date");
  });

  it("lists this week's lectures, earlier time first, with the course time applied", () => {
    expect(ids(v.lectureRows)).toEqual(["eco-early", "alg-4"]);
    expect(v.lectureRows[1].timeLabel).toBe("10:00–12:00");
    expect(v.lectureRows[1]).toMatchObject({ watchedCount: 1, totalCount: 5 });
  });

  it("puts only this week's days in the calendar grid (no overdue homework)", () => {
    expect(v.calendarItems.map((i) => i.id)).toEqual(["hw-this-week", "eco-early", "alg-4"]);
    expect(v.calendarItems.find((i) => i.id === "alg-4")?.label).toBe("Lecture 4");
  });

  it("shows the semester in progress", () => {
    expect(v.semester?.id).toBe("fall");
  });
});

describe("buildWeekView: next week", () => {
  const v = viewFor("2026-11-15");

  it("lists only homework due next week (nothing overdue from earlier)", () => {
    expect(ids(v.dueRows)).toEqual(["hw-next-week"]);
    expect(v.overdueCount).toBe(0);
  });

  it("lists next week's lectures and uses their titles in the grid", () => {
    expect(ids(v.lectureRows)).toEqual(["alg-5"]);
    expect(v.calendarItems.map((i) => i.label)).toEqual(["hw-next-week", "Eigenvalues"]);
  });
});

describe("buildWeekView: last week", () => {
  const v = viewFor("2026-11-01");

  it("lists only last week's unfinished homework", () => {
    expect(ids(v.dueRows)).toEqual(["hw-overdue"]);
    expect(v.overdueCount).toBe(1);
  });

  it("lists last week's lectures, watched or not", () => {
    expect(ids(v.lectureRows)).toEqual(["alg-3"]);
    expect(v.lectureRows[0].watched).toBe(true);
  });
});

describe("buildWeekView: semesters", () => {
  it("shows lectures from both semesters in a week they share, with the newer one named", () => {
    const v = viewFor("2027-01-03");
    expect(ids(v.lectureRows)).toEqual(["alg-last", "calc-1"]);
    expect(v.semester?.id).toBe("winter");
  });

  it("has no semester or lectures in a week between semesters", () => {
    const v = viewFor("2026-08-16");
    expect(v.semester).toBeNull();
    expect(v.lectureRows).toEqual([]);
    expect(v.calendarItems).toEqual([]);
  });

  it("keeps every lecture and due date inside the chosen week", () => {
    for (const week of ["2026-11-01", "2026-11-08", "2026-11-15", "2027-01-03"]) {
      const nav = resolveWeek(week, NOW);
      const v = buildWeekView(SEMESTERS, { ...nav, now: NOW, lectureLabel: String });
      for (const item of v.calendarItems) {
        expect(item.date >= nav.weekStart && item.date <= nav.weekEnd, `${item.id} in ${week}`).toBe(true);
      }
      expect(v.lectureRows.every((l) => format(l.scheduledDate, "yyyy-MM-dd") >= week)).toBe(true);
    }
  });
});
