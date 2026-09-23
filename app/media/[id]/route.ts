import { withDiagnostics } from "@/lib/server/diagnostics";
import { downloadBody } from "@/lib/media/download";
import { GridFSBucket, ObjectId } from "mongodb";
import { database } from "@/lib/admin/db";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
async function respond(request: Request, { params }: Context, head: boolean) {
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/.test(id)) return new Response("Not found", { status: 404 });
  const bucket = new GridFSBucket(await database(), { bucketName: "media" });
  const file = await bucket.find({ _id: new ObjectId(id) }, { timeoutMS: 5000 }).next();
  if (!file) return new Response("Not found", { status: 404 });
  const etag = `"${id}"`;
  const headers = new Headers({
    "Content-Type": file.metadata?.contentType || "application/octet-stream",
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "ETag": etag,
    "Content-Length": String(file.length),
  });
  if (request.headers.get("if-none-match")?.split(",").some((value) => {
    const tag = value.trim().replace(/^W\//, "");
    return tag === etag || tag === "*";
  })) {
    headers.delete("Content-Length");
    return new Response(null, { status: 304, headers });
  }
  if (head) return new Response(null, { headers });
  // Node's adapter provides backpressure and destroys the GridFS stream on
  // cancellation, without accumulating the complete image in process memory.
  const stream = bucket.openDownloadStream(file._id, { timeoutMS: 15_000 });
  return new Response(downloadBody(stream), { headers });
}
async function handleGET(request: Request, context: Context) { return respond(request, context, false); }
async function handleHEAD(request: Request, context: Context) { return respond(request, context, true); }

export const GET = withDiagnostics("/media/[id]", handleGET);

export const HEAD = withDiagnostics("/media/[id]", handleHEAD);
