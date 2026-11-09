import { describe, it, expect } from "vitest";
import { checkLength, parseColor, parseCreditValue, MAX_CREDITS } from "./inputLimits";

describe("checkLength", () => {
  it("passes null and short values, rejects long ones", () => {
    expect(checkLength(null, 5, "X")).toBeNull();
    expect(checkLength("abcde", 5, "X")).toBe("abcde");
    expect(() => checkLength("abcdef", 5, "Name")).toThrow("Name must be 5 characters");
  });
});

describe("parseColor", () => {
  it("accepts blank and #hex, rejects anything else", () => {
    expect(parseColor("  ")).toBeNull();
    expect(parseColor("#6366f1")).toBe("#6366f1");
    expect(() => parseColor("red")).toThrow();
    expect(() => parseColor("url(javascript:1)")).toThrow();
    expect(() => parseColor("#fff; background:red")).toThrow();
  });
});

describe("parseCreditValue", () => {
  it("accepts blank and in-range numbers, rejects the rest", () => {
    expect(parseCreditValue("", "Credits")).toBeNull();
    expect(parseCreditValue("3.5", "Credits")).toBe(3.5);
    expect(() => parseCreditValue("-1", "Credits")).toThrow();
    expect(() => parseCreditValue("1e308", "Credits")).toThrow();
    expect(() => parseCreditValue(String(MAX_CREDITS + 1), "Credits")).toThrow();
    expect(() => parseCreditValue("abc", "Credits")).toThrow();
  });
});
