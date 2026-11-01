import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getGoogleSetupProblem } from "./auth";

const NAMES = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "GOOGLE_TOKEN_ENCRYPTION_KEY",
] as const;

describe("getGoogleSetupProblem", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const n of NAMES) {
      saved[n] = process.env[n];
      process.env[n] = "x";
    }
  });

  afterEach(() => {
    for (const n of NAMES) {
      if (saved[n] === undefined) delete process.env[n];
      else process.env[n] = saved[n];
    }
  });

  it("returns null when everything is set", () => {
    expect(getGoogleSetupProblem()).toBeNull();
  });

  it("names the encryption key when only that is missing", () => {
    delete process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
    expect(getGoogleSetupProblem()).toBe("GOOGLE_TOKEN_ENCRYPTION_KEY");
  });

  it("names the first missing variable", () => {
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REDIRECT_URI;
    expect(getGoogleSetupProblem()).toBe("GOOGLE_CLIENT_SECRET");
  });

  it("treats an empty value as missing", () => {
    process.env.GOOGLE_CLIENT_ID = "";
    expect(getGoogleSetupProblem()).toBe("GOOGLE_CLIENT_ID");
  });
});
