/* eslint-disable @typescript-eslint/no-explicit-any -- loose Prisma-shaped fakes */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

// Minimal in-memory stand-in for the rate_limits table.
type Row = { key: string; count: number; windowAt: Date };
const rows = new Map<string, Row>();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    rateLimit: {
      updateMany: async ({ where, data }: any) => {
        const row = rows.get(where.key);
        if (!row || !(row.windowAt < where.windowAt.lt)) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      },
      upsert: async ({ where, create, update }: any) => {
        const row = rows.get(where.key);
        if (!row) {
          rows.set(where.key, { ...create });
          return { ...create };
        }
        row.count += update.count.increment;
        return { ...row }; // a copy, like a real DB read, not a live reference
      },
      deleteMany: async ({ where }: any) => {
        if (where.key) rows.delete(where.key);
        return { count: 0 };
      },
    },
  },
}));

import { checkRateLimit, recordAttempt } from "./rateLimit";

beforeEach(() => rows.clear());

describe("checkRateLimit", () => {
  it("allows 8 attempts, then blocks the 9th", async () => {
    for (let i = 0; i < 8; i++) await checkRateLimit("login:a@b.c");
    await expect(checkRateLimit("login:a@b.c")).rejects.toThrow("Too many attempts");
  });

  it("counts a parallel burst fully: no more than 8 get through", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 30 }, () => checkRateLimit("login:burst"))
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(8);
  });

  it("starts a fresh window once the old one expired", async () => {
    for (let i = 0; i < 9; i++) await checkRateLimit("k").catch(() => {});
    rows.get("k")!.windowAt = new Date(Date.now() - 16 * 60 * 1000);
    await expect(checkRateLimit("k")).resolves.toBeUndefined();
    expect(rows.get("k")!.count).toBe(1);
  });

  it("a successful attempt gives the budget back", async () => {
    for (let i = 0; i < 8; i++) await checkRateLimit("k2");
    await recordAttempt("k2", true);
    await expect(checkRateLimit("k2")).resolves.toBeUndefined();
  });
});
