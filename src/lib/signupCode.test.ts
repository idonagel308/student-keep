/* eslint-disable @typescript-eslint/no-explicit-any -- loose Prisma-shaped fakes */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateCode, hashCode, normalizeCode, redeemSignupCode, MAX_CODE_ATTEMPTS } from "./signupCode";

type Row = { id: string; email: string; status: string; codeHash: string | null; attempts: number; expiresAt: Date | null };

let row: Row | null;
const fake = vi.hoisted(() => ({
  findUnique: async ({ where }: any) => (row && row.email === where.email ? { ...row } : null),
  update: async ({ data }: any) => {
    if (data.attempts?.increment) row!.attempts += data.attempts.increment;
    else Object.assign(row!, data);
    return { ...row };
  },
  updateMany: async ({ where, data }: any) => {
    const ok =
      row && row.status === where.status && row.codeHash === where.codeHash && row.expiresAt! > where.expiresAt.gt;
    if (ok) Object.assign(row!, data);
    return { count: ok ? 1 : 0 };
  },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    signupRequest: fake,
    $transaction: (fn: any) => fn({ signupRequest: fake }),
  },
}));

const CODE = "ABCD-EFGH";
const issue = (over: Partial<Row> = {}) => {
  row = {
    id: "1",
    email: "a@x.com",
    status: "approved",
    codeHash: hashCode(CODE),
    attempts: 0,
    expiresAt: new Date(Date.now() + 60_000),
    ...over,
  };
};
const create = vi.fn(async () => "user");

beforeEach(() => {
  create.mockClear();
  issue();
});

describe("code helpers", () => {
  it("generates XXXX-XXXX and ignores case/dashes when hashing", () => {
    expect(generateCode()).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(normalizeCode("abcd efgh")).toBe("ABCDEFGH");
    expect(hashCode("abcd-efgh")).toBe(hashCode("ABCDEFGH"));
  });
});

describe("redeemSignupCode", () => {
  it("accepts the right code once, then refuses it", async () => {
    expect(await redeemSignupCode("a@x.com", "abcd-efgh", create)).toEqual({ ok: true, value: "user" });
    expect((await redeemSignupCode("a@x.com", CODE, create)).ok).toBe(false);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("rejects a code for another email, an expired code, and an unapproved request", async () => {
    expect((await redeemSignupCode("b@x.com", CODE, create)).ok).toBe(false);
    issue({ expiresAt: new Date(Date.now() - 1) });
    expect((await redeemSignupCode("a@x.com", CODE, create)).ok).toBe(false);
    issue({ status: "pending", codeHash: null });
    expect((await redeemSignupCode("a@x.com", CODE, create)).ok).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it("wipes the code after too many wrong guesses, even if the right one follows", async () => {
    for (let i = 0; i < MAX_CODE_ATTEMPTS; i++) await redeemSignupCode("a@x.com", "WRONG-000", create);
    expect(row!.codeHash).toBeNull();
    expect((await redeemSignupCode("a@x.com", CODE, create)).ok).toBe(false);
  });

  it("lets only one of many concurrent redemptions through", async () => {
    const results = await Promise.all(Array.from({ length: 10 }, () => redeemSignupCode("a@x.com", CODE, create)));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(create).toHaveBeenCalledTimes(1);
  });
});
