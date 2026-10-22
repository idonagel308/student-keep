import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { decryptToken, encryptToken, isEncrypted } from "./tokenCrypto";

describe("tokenCrypto", () => {
  const original = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  });

  afterEach(() => {
    if (original === undefined) delete process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
    else process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = original;
  });

  it("round-trips a token", () => {
    const stored = encryptToken("1//refresh-token");
    expect(isEncrypted(stored)).toBe(true);
    expect(stored).not.toContain("refresh-token");
    expect(decryptToken(stored)).toBe("1//refresh-token");
  });

  it("uses a fresh IV each time", () => {
    expect(encryptToken("same")).not.toBe(encryptToken("same"));
  });

  it("passes legacy plain-text tokens through untouched", () => {
    expect(isEncrypted("1//plain")).toBe(false);
    expect(decryptToken("1//plain")).toBe("1//plain");
  });

  it("returns plain text when no key is configured", () => {
    delete process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
    expect(encryptToken("abc")).toBe("abc");
  });

  it("refuses to decrypt without the key", () => {
    const stored = encryptToken("abc");
    delete process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
    expect(() => decryptToken(stored)).toThrow();
  });

  it("rejects tampered ciphertext", () => {
    const stored = encryptToken("abc");
    const bytes = Buffer.from(stored.slice("enc:v1:".length), "base64");
    bytes[bytes.length - 1] ^= 1;
    expect(() => decryptToken("enc:v1:" + bytes.toString("base64"))).toThrow();
  });

  it("rejects a key of the wrong length", () => {
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = Buffer.from("short").toString("base64");
    expect(() => encryptToken("abc")).toThrow(/32/);
  });
});
