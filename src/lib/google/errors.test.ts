import { describe, expect, it } from "vitest";
import { describeGoogleError } from "./errors";

const err = (m: string) => new Error(m);

describe("describeGoogleError", () => {
  it("explains a disabled API", () => {
    const msg = describeGoogleError(
      err('Google Calendar create failed (403): {"error":{"errors":[{"reason":"accessNotConfigured"}],"status":"PERMISSION_DENIED","message":"Google Calendar API has not been used in project 123 before or it is disabled."}}')
    );
    expect(msg).toMatch(/isn't enabled/);
  });

  it("explains missing scopes", () => {
    const msg = describeGoogleError(
      err('Google Calendar create failed (403): {"error":{"message":"Request had insufficient authentication scopes."}}')
    );
    expect(msg).toMatch(/tick every permission box/);
  });

  it("explains a revoked or expired grant", () => {
    expect(describeGoogleError(err('Google token request failed (400): {"error":"invalid_grant"}'))).toMatch(
      /Disconnect and connect again/
    );
  });

  it("explains an unreadable stored token", () => {
    expect(describeGoogleError(err("Unsupported state or unable to authenticate data"))).toMatch(/encryption key/);
  });

  it("falls back by status code, then to the raw text", () => {
    expect(describeGoogleError(err("Google Tasks create failed (401): nope"))).toMatch(/rejected the sign-in/);
    expect(describeGoogleError(err("Google Tasks create failed (403): nope"))).toMatch(/test-user list/);
    expect(describeGoogleError(err("Google Tasks create failed (429): slow"))).toMatch(/rate-limiting/);
    expect(describeGoogleError(err("boom"))).toBe("Google sync failed: boom");
  });
});
