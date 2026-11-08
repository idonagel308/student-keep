import { describe, it, expect } from "vitest";
import { gpaStats, semesterProgress, semesterPace, type CourseWithChildren } from "./progress";

const NOW = new Date("2026-11-08T12:00:00Z");
const past = new Date("2026-11-01T12:00:00Z");
const future = new Date("2026-11-20T12:00:00Z");

// Only the fields progress.ts reads; cast keeps the fixtures short.
const course = (
  lectures: { watched: boolean; scheduledDate: Date | null }[],
  homework: { completed: boolean; dueDate: Date | null }[]
) => ({ lectures, homework }) as unknown as CourseWithChildren;

describe("semesterProgress", () => {
  it("counts lectures and homework together in the percentage", () => {
    const p = semesterProgress([
      course(
        [
          { watched: true, scheduledDate: null },
          { watched: false, scheduledDate: null },
        ],
        [
          { completed: true, dueDate: null },
          { completed: true, dueDate: null },
        ]
      ),
    ]);
    expect(p.totalItems).toBe(4);
    expect(p.doneItems).toBe(3);
    expect(p.pct).toBe(75);
  });

  it("includes homework even when the course has no lectures", () => {
    const p = semesterProgress([course([], [{ completed: true, dueDate: null }])]);
    expect(p.pct).toBe(100);
  });

  it("returns 0% (not NaN) when there is nothing to track", () => {
    expect(semesterProgress([course([], [])]).pct).toBe(0);
  });
});

describe("semesterPace", () => {
  it("treats lectures and homework as due once their date has passed", () => {
    const pace = semesterPace(
      [
        course(
          [
            { watched: true, scheduledDate: past }, // due, done
            { watched: false, scheduledDate: future }, // not due
          ],
          [
            { completed: false, dueDate: past }, // due, not done
            { completed: false, dueDate: null }, // undated: never due
          ]
        ),
      ],
      NOW
    );
    expect(pace.totalItems).toBe(4);
    expect(pace.doneItems).toBe(1);
    expect(pace.due).toBe(2);
    expect(pace.diff).toBe(-1); // behind by the one overdue assignment
  });
});

describe("gpaStats", () => {
  it("excludes ungraded courses from both earned credits and the average", () => {
    const stats = gpaStats([{ credits: 4, examScore: null, passGrade: false }]);
    expect(stats.credits).toBe(4);
    expect(stats.earned).toBe(0);
    expect(stats.avg).toBeNull();
  });

  it("counts a numerically passed course toward earned credits and the average", () => {
    const stats = gpaStats([{ credits: 4, examScore: 85, passGrade: false }]);
    expect(stats.earned).toBe(4);
    expect(stats.avg).toBe(85);
  });

  it("does not count a numerically failed course toward earned credits, but does average it", () => {
    const stats = gpaStats([{ credits: 4, examScore: 40, passGrade: false }]);
    expect(stats.earned).toBe(0);
    expect(stats.avg).toBe(40);
  });

  it("counts a pass-graded course's credits as earned without affecting the average", () => {
    const stats = gpaStats([{ credits: 4, examScore: null, passGrade: true }]);
    expect(stats.earned).toBe(4);
    expect(stats.gradedCredits).toBe(0);
    expect(stats.avg).toBeNull();
  });

  it("mixes pass-graded and numerically graded courses correctly", () => {
    const stats = gpaStats([
      { credits: 4, examScore: null, passGrade: true }, // pass, +4 earned, no average contribution
      { credits: 3, examScore: 90, passGrade: false }, // +3 earned, averages in
      { credits: 2, examScore: 50, passGrade: false }, // not earned, still averages in
      { credits: 5, examScore: null, passGrade: false }, // ungraded, excluded entirely
    ]);
    expect(stats.credits).toBe(14);
    expect(stats.earned).toBe(7); // 4 (pass) + 3 (numeric pass)
    expect(stats.gradedCredits).toBe(5); // only the two numerically graded courses
    expect(stats.avg).toBe((90 * 3 + 50 * 2) / 5);
  });

  it("ignores zero-credit courses even when pass-graded", () => {
    const stats = gpaStats([{ credits: 0, examScore: null, passGrade: true }]);
    expect(stats.earned).toBe(0);
    expect(stats.credits).toBe(0);
  });
});
