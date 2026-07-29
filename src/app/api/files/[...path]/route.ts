import { get } from "@vercel/blob";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathname = path.map(decodeURIComponent).join("/");

  const result = await get(pathname, { access: "private" });
  if (!result) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType ?? "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(
        pathname.split("/").pop() ?? "file.pdf"
      )}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
