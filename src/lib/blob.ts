import { put, del, get } from "@vercel/blob";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { randomBytes } from "crypto";

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10MB per file
const PDF_MAGIC = Buffer.from("%PDF-");

/**
 * The client-supplied filename becomes part of the storage key (see
 * below), so it must never be trusted verbatim: a name like "../../x" or
 * one containing "/" could relocate the object outside the caller's
 * `prefix`, onto a path whose read-authorization (canReadBlobPath) is
 * evaluated for a *different* owner. Reduce to a safe basename first.
 */
export function sanitizeFilename(name: string) {
  const base = name.split(/[/\\]/).pop() || "file.pdf";
  const cleaned = base.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^\.+/, "");
  return cleaned || "file.pdf";
}

async function assertLooksLikePdf(file: File) {
  if (file.size === 0) throw new Error("The file is empty.");
  if (file.size > MAX_PDF_BYTES) {
    throw new Error("PDF files must be 10MB or smaller.");
  }
  const head = Buffer.from(await file.slice(0, 5).arrayBuffer());
  if (!head.equals(PDF_MAGIC)) {
    throw new Error("Please upload a valid PDF file.");
  }
}

/**
 * Storage backend is chosen automatically from which credentials are
 * present, not from a separate feature flag: as long as the R2_* env vars
 * are unset, every call below behaves exactly as it does today (Vercel
 * Blob). Setting all four R2_* vars is the entire cutover — no code
 * change or redeploy logic needed beyond this file. See R2_MIGRATION.md.
 */
interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

function r2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

export function getActiveStorageProvider(): "r2" | "vercel-blob" {
  return r2Config() ? "r2" : "vercel-blob";
}

let cachedClient: { client: S3Client; accountId: string } | null = null;

function r2Client(config: R2Config): S3Client {
  if (cachedClient && cachedClient.accountId === config.accountId) {
    return cachedClient.client;
  }
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  cachedClient = { client, accountId: config.accountId };
  return client;
}

export async function uploadPdf(file: File, prefix: string) {
  await assertLooksLikePdf(file);

  const r2 = r2Config();
  if (r2) {
    const key = `${prefix}/${randomBytes(8).toString("hex")}-${sanitizeFilename(file.name)}`;
    const body = Buffer.from(await file.arrayBuffer());
    await r2Client(r2).send(
      new PutObjectCommand({
        Bucket: r2.bucket,
        Key: key,
        Body: body,
        ContentType: "application/pdf",
      })
    );
    return { url: `/api/files/${key}`, name: file.name };
  }

  const blob = await put(`${prefix}/${sanitizeFilename(file.name)}`, file, {
    access: "private",
    addRandomSuffix: true,
    contentType: "application/pdf",
  });
  // The display name shown in the UI can keep the original filename —
  // only the storage key needed sanitizing.
  return { url: `/api/files/${blob.pathname}`, name: file.name };
}

export async function deleteBlob(url: string | null | undefined) {
  if (!url) return;
  const pathname = url.startsWith("/api/files/")
    ? url.slice("/api/files/".length)
    : url;

  const r2 = r2Config();
  try {
    if (r2) {
      await r2Client(r2).send(
        new DeleteObjectCommand({ Bucket: r2.bucket, Key: pathname })
      );
    } else {
      await del(pathname);
    }
  } catch {
    // ignore missing blobs
  }
}

/**
 * Rejects path-traversal / empty segments before a pathname is ever
 * joined and handed to the storage backend or canReadBlobPath. Kept as a
 * pure, exported predicate (rather than inline in the route handler) so
 * it has direct unit test coverage — this is the piece the migration doc
 * calls out as "must not regress".
 */
export function isSafeStoragePath(segments: string[]): boolean {
  return (
    segments.length > 0 &&
    segments.every((seg) => seg !== "" && seg !== "." && seg !== "..")
  );
}

export interface StoredPdf {
  body: ReadableStream | Buffer;
  contentType: string | null;
}

export async function getStoredPdf(pathname: string): Promise<StoredPdf | null> {
  const r2 = r2Config();
  if (r2) {
    try {
      const result = await r2Client(r2).send(
        new GetObjectCommand({ Bucket: r2.bucket, Key: pathname })
      );
      if (!result.Body) return null;
      const bytes = await result.Body.transformToByteArray();
      return { body: Buffer.from(bytes), contentType: result.ContentType ?? null };
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name;
      const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata
        ?.httpStatusCode;
      if (name === "NoSuchKey" || name === "NotFound" || status === 404) return null;
      throw err;
    }
  }

  const result = await get(pathname, { access: "private" });
  if (!result || !result.stream) return null;
  return { body: result.stream, contentType: result.blob.contentType ?? null };
}
