import { describe, it, expect } from "vitest";
import { gpaStats } from "./progress";

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
