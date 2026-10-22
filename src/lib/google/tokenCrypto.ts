import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Marks a stored value as ciphertext so tokens saved before encryption was
// enabled (plain text) are still readable and get upgraded on next use.
const PREFIX = "enc:v1:";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getKey(): Buffer | null {
  const raw = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY must be 32 random bytes, base64-encoded.");
  }
  return key;
}

export function isEncryptionConfigured(): boolean {
  return getKey() !== null;
}

export function isEncrypted(stored: string): boolean {
  return stored.startsWith(PREFIX);
}

/** AES-256-GCM. Returns the input unchanged when no key is configured. */
export function encryptToken(plain: string): string {
  const key = getKey();
  if (!key) return plain;
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

export function decryptToken(stored: string): string {
  if (!isEncrypted(stored)) return stored;
  const key = getKey();
  if (!key) {
    throw new Error("A stored Google token is encrypted but GOOGLE_TOKEN_ENCRYPTION_KEY is not set.");
  }
  const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
  const iv = raw.subarray(0, IV_BYTES);
  const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = raw.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
