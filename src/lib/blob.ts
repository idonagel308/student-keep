import { put, del } from "@vercel/blob";

export async function uploadPdf(file: File, prefix: string) {
  const blob = await put(`${prefix}/${file.name}`, file, {
    access: "private",
    addRandomSuffix: true,
    contentType: "application/pdf",
  });
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
