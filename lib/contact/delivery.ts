import { ContactError } from "./request";

export type EmailPayload = {
  from: string; to: string[]; reply_to: string; subject: string; text: string; html: string;
};

/** Two bounded attempts with the same provider key and byte-identical payload. */
export async function deliverEmail(
  payload: EmailPayload,
  id: string,
  apiKey: string,
  fetcher: typeof fetch = fetch,
  timeoutMs = 8000,
) {
  const body = JSON.stringify(payload);
  for (let attempt = 0; attempt < 2; attempt++) {
    let retryable = true;
    try {
      const response = await fetcher("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `contact/${id}` },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
      retryable = response.status >= 500;
      if (response.ok) {
        const result: unknown = await response.json();
        if (typeof result === "object" && result !== null && "id" in result && typeof result.id === "string" && result.id)
          return;
        retryable = true;
      } else {
        await response.body?.cancel();
      }
    } catch {
      retryable = true;
    }
    if (!retryable || attempt === 1) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new ContactError("We couldn't send that. Please email us directly.", 502);
}
