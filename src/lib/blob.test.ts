import { describe, it, expect, afterEach } from "vitest";
import {
  sanitizeFilename,
  isSafeStoragePath,
  getActiveStorageProvider,
  uploadPdf,
  deleteBlob,
  getStoredPdf,
} from "./blob";

const R2_ENV_KEYS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
] as const;

function clearR2Env() {
  for (const key of R2_ENV_KEYS) delete process.env[key];
}

function makePdfFile(name: string, bytes = Buffer.from("%PDF-1.4\n%%EOF")) {
  return new File([bytes], name, { type: "application/pdf" });
}

describe("sanitizeFilename", () => {
  it("keeps a normal filename as-is", () => {
    expect(sanitizeFilename("lecture-notes.pdf")).toBe("lecture-notes.pdf");
  });

  it("strips directory components from a path-like name", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("a/b/c.pdf")).toBe("c.pdf");
    expect(sanitizeFilename("a\\b\\c.pdf")).toBe("c.pdf");
  });

  it("replaces disallowed characters", () => {
    expect(sanitizeFilename("my file (final)!.pdf")).toBe("my_file__final__.pdf");
  });

  it("strips leading dots so the result can't become hidden or '..'", () => {
    expect(sanitizeFilename("..pdf")).toBe("pdf");
  });

  it("falls back to a default name when nothing usable remains", () => {
    expect(sanitizeFilename("")).toBe("file.pdf");
    expect(sanitizeFilename("...")).toBe("file.pdf");
  });
});

describe("isSafeStoragePath", () => {
  it("accepts a normal multi-segment path", () => {
    expect(isSafeStoragePath(["lectures", "abc123", "notes.pdf"])).toBe(true);
  });

  it("rejects an empty path", () => {
    expect(isSafeStoragePath([])).toBe(false);
  });

  it("rejects traversal and empty segments", () => {
    expect(isSafeStoragePath(["..", "secret.pdf"])).toBe(false);
    expect(isSafeStoragePath(["lectures", "..", "x.pdf"])).toBe(false);
    expect(isSafeStoragePath(["lectures", ".", "x.pdf"])).toBe(false);
    expect(isSafeStoragePath(["lectures", "", "x.pdf"])).toBe(false);
  });
});

describe("getActiveStorageProvider", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    clearR2Env();
    for (const key of R2_ENV_KEYS) {
      if (originalEnv[key]) process.env[key] = originalEnv[key];
    }
  });

  it("defaults to vercel-blob when no R2 vars are set", () => {
    clearR2Env();
    expect(getActiveStorageProvider()).toBe("vercel-blob");
  });

  it("stays on vercel-blob if any single R2 var is missing", () => {
    clearR2Env();
    process.env.R2_ACCOUNT_ID = "acct";
    process.env.R2_ACCESS_KEY_ID = "key";
    process.env.R2_SECRET_ACCESS_KEY = "secret";
    // R2_BUCKET_NAME intentionally left unset
    expect(getActiveStorageProvider()).toBe("vercel-blob");
  });

  it("switches to r2 once all four vars are present", () => {
    clearR2Env();
    process.env.R2_ACCOUNT_ID = "acct";
    process.env.R2_ACCESS_KEY_ID = "key";
    process.env.R2_SECRET_ACCESS_KEY = "secret";
    process.env.R2_BUCKET_NAME = "bucket";
    expect(getActiveStorageProvider()).toBe("r2");
  });
});

describe("uploadPdf input validation (backend-independent — rejected before any network call)", () => {
  it("rejects an empty file", async () => {
    const file = makePdfFile("empty.pdf", Buffer.alloc(0));
    await expect(uploadPdf(file, "test")).rejects.toThrow("empty");
  });

  it("rejects a file over 10MB", async () => {
    const big = Buffer.alloc(10 * 1024 * 1024 + 1, 0x41);
    const file = makePdfFile("big.pdf", big);
    await expect(uploadPdf(file, "test")).rejects.toThrow("10MB");
  });

  it("rejects a file that isn't actually a PDF", async () => {
    const file = makePdfFile("fake.pdf", Buffer.from("not a pdf at all"));
    await expect(uploadPdf(file, "test")).rejects.toThrow("valid PDF");
  });
});

// --- Live round trip against a real R2 bucket -------------------------
//
// Only runs when R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY /
// R2_BUCKET_NAME are all set in the environment (they are not, as of the
// R2_MIGRATION.md proposal — nothing has been migrated yet). Once real R2
// credentials exist, running `npm test` exercises the exact code path
// production will use: upload -> read back through getStoredPdf (the same
// function the /api/files/[...path] route calls) -> delete -> confirm gone.
const r2Configured = R2_ENV_KEYS.every((key) => !!process.env[key]);

describe.skipIf(!r2Configured)("R2 live round trip", () => {
  const uploadedUrls: string[] = [];

  afterEach(async () => {
    while (uploadedUrls.length) {
      await deleteBlob(uploadedUrls.pop());
    }
  });

  it("reports r2 as the active provider when configured", () => {
    expect(getActiveStorageProvider()).toBe("r2");
  });

  it("uploads a PDF, reads it back byte-for-byte, then deletes it", async () => {
    const content = Buffer.from(`%PDF-1.4\n% test upload ${Date.now()}\n%%EOF`);
    const file = makePdfFile("integration-test.pdf", content);

    const { url, name } = await uploadPdf(file, "vitest-r2-roundtrip");
    uploadedUrls.push(url);

    expect(name).toBe("integration-test.pdf");
    expect(url.startsWith("/api/files/")).toBe(true);

    const key = url.slice("/api/files/".length);
    const stored = await getStoredPdf(key);
    expect(stored).not.toBeNull();
    expect(stored!.contentType).toBe("application/pdf");

    const body = stored!.body;
    const bytes =
      body instanceof Buffer
        ? body
        : Buffer.from(await new Response(body as BodyInit).arrayBuffer());
    expect(bytes.equals(content)).toBe(true);

    await deleteBlob(url);
    uploadedUrls.pop(); // already deleted, don't double-delete in afterEach

    const afterDelete = await getStoredPdf(key);
    expect(afterDelete).toBeNull();
  });

  it("deleteBlob on a nonexistent key does not throw", async () => {
    await expect(
      deleteBlob("/api/files/vitest-r2-roundtrip/does-not-exist.pdf")
    ).resolves.toBeUndefined();
  });
});
