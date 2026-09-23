import { HttpError } from "./http-error";

export async function readJson(request: Request, max = 1_000_000, timeoutMs = 5000): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json")
    throw new HttpError("JSON is required.", 415);
  if (Number(request.headers.get("content-length")) > max)
    throw new HttpError("Request is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError("Request body is required.", 400);
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
      if (timedOut) throw new HttpError("Request timed out. Please try again.", 408);
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        void reader.cancel().catch(() => {});
        throw new HttpError("Request is too large.", 413);
      }
      chunks.push(value);
    }
    try { return JSON.parse(Buffer.concat(chunks, size).toString("utf8")); }
    catch { throw new HttpError("Invalid JSON.", 400); }
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}
