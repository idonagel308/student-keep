import { describe, it, expect } from "vitest";
import { buildTaskBody } from "./tasks";

describe("buildTaskBody", () => {
  it("builds a needsAction task with the due date at midnight UTC", () => {
    const body = buildTaskBody({
      courseName: "Calc 2",
      name: "Maman 11",
      details: null,
      dueDate: new Date("2026-08-01T18:30:00Z"),
      completed: false,
    });
    expect(body.title).toBe("Calc 2: Maman 11");
    expect(body.due).toBe("2026-08-01T00:00:00.000Z");
    expect(body.status).toBe("needsAction");
    expect(body.notes).toBeUndefined();
  });

  it("marks status completed when the homework is done", () => {
    const body = buildTaskBody({
      courseName: "Calc 2",
      name: "Maman 11",
      details: "Chapters 3-4",
      dueDate: new Date("2026-08-01T00:00:00Z"),
      completed: true,
    });
    expect(body.status).toBe("completed");
    expect(body.notes).toBe("Chapters 3-4");
  });
});
