import { withDiagnostics } from "@/lib/server/diagnostics";
import { GridFSBucket } from "mongodb";
import { database } from "@/lib/admin/db";
import { getSession } from "@/lib/admin/auth";
import { failure, HttpError, json, sameOrigin } from "@/lib/admin/http";
import { readUpload, validateImage, UploadError } from "@/lib/media/upload";

export const runtime = "nodejs";
async function handlePOST(request: Request) {
  try {
    sameOrigin(request);
    if (!(await getSession())) throw new HttpError("Please sign in again.", 401);
    const buffer = await readUpload(request);
    const metadata = await validateImage(buffer);
    const bucket = new GridFSBucket(await database(), { bucketName: "media" });
    const upload = bucket.openUploadStream("poster", { metadata, timeoutMS: 10_000 });
    try {
      await new Promise<void>((resolve, reject) => {
        upload.on("finish", resolve);
        upload.on("error", reject);
        upload.end(buffer);
      });
    } catch (error) {
      await upload.abort().catch(() => {});
      throw error;
    }
    return json({ url: `/media/${upload.id.toHexString()}` }, 201);
  } catch (error) {
    return failure(error instanceof UploadError ? new HttpError(error.message, error.status) : error);
  }
}

export const POST = withDiagnostics("/api/admin/uploads", handlePOST);
