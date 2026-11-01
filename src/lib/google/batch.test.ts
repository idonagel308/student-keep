import { describe, expect, it, vi } from "vitest";
import { describeSyncResult, runBatches, type SyncResult } from "./batch";

const empty = (): SyncResult => ({ created: 0, updated: 0, removed: 0, unchanged: 0, failed: 0, firstError: null });

describe("runBatches", () => {
  it("counts each outcome and keeps going after a failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const boom = new Error("boom");
    const outcomes = ["created", "updated", "removed", "fail", "updated", "created", "unchanged"] as const;
    const result = await runBatches(
      [...outcomes],
      async (o) => {
        if (o === "fail") throw boom;
        return o;
      },
      (o) => o
    );
    expect(result).toMatchObject({ created: 2, updated: 2, removed: 1, unchanged: 1, failed: 1, firstError: boom });
  });

  it("handles an empty list", async () => {
    expect(await runBatches([], async () => "created", () => "")).toEqual(empty());
  });
});

describe("describeSyncResult", () => {
  it("lists only the non-zero counts", () => {
    expect(describeSyncResult("Lectures", { ...empty(), created: 2, updated: 17, failed: 1 })).toBe(
      "Lectures: 2 added, 17 updated, 1 failed"
    );
    expect(describeSyncResult("Lectures", { ...empty(), updated: 2, unchanged: 46 })).toBe(
      "Lectures: 2 updated, 46 already up to date"
    );
  });

  it("explains an empty result", () => {
    expect(describeSyncResult("Assignments", empty())).toMatch(/nothing to sync/);
  });
});
