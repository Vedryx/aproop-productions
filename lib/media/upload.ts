import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export class UploadError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function readUpload(request: Request, timeoutMs = 15_000) {
  if (Number(request.headers.get("content-length")) > MAX_UPLOAD_BYTES)
    throw new UploadError("Images must be at most 4 MB.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new UploadError("Select an image.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    void reader.cancel().catch(() => {});
  }, timeoutMs);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (timedOut) throw new UploadError("Upload timed out. Please try again.", 408);
      if (done) break;
      size += value.byteLength;
      if (size > MAX_UPLOAD_BYTES) {
        void reader.cancel().catch(() => {});
        throw new UploadError("Images must be at most 4 MB.", 413);
      }
      chunks.push(value);
    }
    if (!size) throw new UploadError("Select an image.", 400);
    return Buffer.concat(chunks, size);
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}

export async function validateImage(buffer: Buffer) {
  try {
    const image = sharp(buffer, { limitInputPixels: 25_000_000, failOn: "error", animated: true });
    const metadata = await image.metadata();
    if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format) || (metadata.pages || 1) > 1)
      throw new Error("Unsupported image");
    // Decode all pixels: a convincing header alone is not an image. The bounded
    // thumbnail avoids allocating an uncompressed full-size output buffer.
    await image.resize({ width: 1, height: 1 }).raw().toBuffer();
    return { contentType: `image/${metadata.format}`, width: metadata.width, height: metadata.height };
  } catch {
    throw new UploadError("Use a valid, still JPG, PNG or WebP image up to 25 megapixels.", 400);
  }
}
