export class ContactError extends Error {
  constructor(message: string, public status: number, public retryAfter?: number) {
    super(message);
  }
}

export const MAX_CONTACT_BYTES = 32 * 1024;

export async function readContactBody(request: Request, timeoutMs = 5000): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json")
    throw new ContactError("JSON is required.", 415);
  if (Number(request.headers.get("content-length")) > MAX_CONTACT_BYTES)
    throw new ContactError("Request is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ContactError("Malformed request.", 400);
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
      if (timedOut) throw new ContactError("Request timed out. Please try again.", 408);
      if (done) break;
      size += value.byteLength;
      if (size > MAX_CONTACT_BYTES) {
        void reader.cancel().catch(() => {});
        throw new ContactError("Request is too large.", 413);
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof ContactError) throw error;
    throw new ContactError("Malformed request.", 400);
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}
