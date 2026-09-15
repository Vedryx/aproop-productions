import { GridFSBucket } from "mongodb";
import { database } from "@/lib/admin/db";
import { getSession } from "@/lib/admin/auth";
import { failure, HttpError, json, sameOrigin } from "@/lib/admin/http";
const MAX = 5 * 1024 * 1024;
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    if (!(await getSession()))
      throw new HttpError("Please sign in again.", 401);
    const reader = request.body?.getReader();
    if (!reader) throw new HttpError("Select an image.", 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX) {
        await reader.cancel();
        throw new HttpError("Images must be smaller than 5 MB.", 413);
      }
      chunks.push(value);
    }
    const buffer = Buffer.concat(chunks);
    let contentType = "";
    if (buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255])))
      contentType = "image/jpeg";
    if (
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      contentType = "image/png";
    if (
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    )
      contentType = "image/webp";
    if (!contentType) throw new HttpError("Use a JPG, PNG or WebP image.", 400);
    const bucket = new GridFSBucket(await database(), { bucketName: "media" });
    const upload = bucket.openUploadStream("poster", {
      metadata: { contentType },
    });
    await new Promise<void>((resolve, reject) => {
      upload.on("finish", resolve);
      upload.on("error", reject);
      upload.end(buffer);
    });
    return json({ url: `/media/${upload.id.toHexString()}` }, 201);
  } catch (error) {
    return failure(error);
  }
}
