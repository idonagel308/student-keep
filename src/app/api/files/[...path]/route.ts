import { getStoredPdf, isSafeStoragePath } from "@/lib/blob";
import { canReadBlobPath } from "@/lib/dal";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  // Next.js already URL-decodes each catch-all segment; decoding again here
  // would let a double-encoded segment (e.g. "%252e%252e") reintroduce
  // characters like "/" after this function returns. Reject traversal and
  // empty segments outright as defense in depth — canReadBlobPath's exact
  // stored-URL match is the real authorization boundary, this just keeps
  // obviously-malformed paths from ever reaching it or the storage backend.
  if (!isSafeStoragePath(path)) {
    return new Response("Not found", { status: 404 });
  }
  const pathname = path.join("/");

  // Same 404 for "not yours" and "doesn't exist" so paths can't be probed.
  if (!(await canReadBlobPath(pathname))) {
    return new Response("Not found", { status: 404 });
  }

  const result = await getStoredPdf(pathname);
  if (!result) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(result.body as BodyInit, {
    headers: {
      "Content-Type": result.contentType ?? "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(
        pathname.split("/").pop() ?? "file.pdf"
      )}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
