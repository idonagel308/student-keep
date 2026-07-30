import { put, del } from "@vercel/blob";

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10MB per file
const PDF_MAGIC = Buffer.from("%PDF-");

/**
 * The client-supplied filename becomes part of the blob storage key (see
 * below), so it must never be trusted verbatim: a name like "../../x" or
 * one containing "/" could relocate the object outside the caller's
 * `prefix`, onto a path whose read-authorization (canReadBlobPath) is
 * evaluated for a *different* owner. Reduce to a safe basename first.
 */
function sanitizeFilename(name: string) {
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

export async function uploadPdf(file: File, prefix: string) {
  await assertLooksLikePdf(file);

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
  try {
    await del(pathname);
  } catch {
    // ignore missing blobs
  }
}
