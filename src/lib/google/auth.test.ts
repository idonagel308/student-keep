import { describe, it, expect } from "vitest";
import { isTokenExpired } from "./auth";

describe("isTokenExpired", () => {
  const now = new Date("2026-08-01T12:00:00Z");

  it("treats a null expiry as expired", () => {
    expect(isTokenExpired(null, now)).toBe(true);
  });

  it("treats a past expiry as expired", () => {
    expect(isTokenExpired(new Date("2026-08-01T11:00:00Z"), now)).toBe(true);
  });

  it("treats an expiry within the 60s safety buffer as expired", () => {
    expect(isTokenExpired(new Date("2026-08-01T12:00:30Z"), now)).toBe(true);
  });

  it("treats a comfortably future expiry as not expired", () => {
    expect(isTokenExpired(new Date("2026-08-01T13:00:00Z"), now)).toBe(false);
  });
});
