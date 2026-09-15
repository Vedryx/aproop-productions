import { GridFSBucket, ObjectId } from "mongodb";
import { database } from "@/lib/admin/db";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/.test(id))
    return new Response("Not found", { status: 404 });
  const bucket = new GridFSBucket(await database(), { bucketName: "media" });
  const file = await bucket.find({ _id: new ObjectId(id) }).next();
  if (!file) return new Response("Not found", { status: 404 });
  const chunks: Buffer[] = [];
  for await (const chunk of bucket.openDownloadStream(file._id))
    chunks.push(chunk);
  return new Response(new Uint8Array(Buffer.concat(chunks)), {
    headers: {
      "Content-Type": file.metadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
