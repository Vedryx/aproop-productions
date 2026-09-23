import { randomUUID } from "node:crypto";
import { parseEnquiry, subjectFor, textFor, htmlFor } from "../contact";
import { ContactError, readContactBody } from "./request";
import { clientIdentity } from "../server/client-identity";
import type { ContactStore } from "./store";
import type { EmailPayload } from "./delivery";

type Dependencies = {
  store: () => Promise<ContactStore>;
  send: (payload: EmailPayload, id: string) => Promise<void>;
  configured: () => boolean;
  from: string; to: string; origin?: string; vercel?: boolean; trustedIpHeader?: string;
};

export function createContactHandler(deps: Dependencies) {
  return async (request: Request) => {
    const requestId = randomUUID();
    const json = (body: unknown, status = 200, retryAfter?: number) => Response.json(body, {
      status, headers: {
        "Cache-Control": "no-store", "X-Request-Id": requestId,
        ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}),
      },
    });
    try {
      const origin = request.headers.get("origin");
      if (origin && origin !== (deps.origin || new URL(request.url).origin))
        throw new ContactError("This request must come from the website.", 403);
      const body = await readContactBody(request);
      const raw = body && typeof body === "object" ? body as Record<string, unknown> : {};
      const age = typeof raw.t === "number" ? Date.now() - raw.t : Infinity;
      if ((typeof raw.website === "string" && raw.website.trim() !== "") || (age >= 0 && age < 2000))
        return json({ ok: true });
      const parsed = parseEnquiry(body);
      if (!parsed.ok) throw new ContactError(parsed.error, 400);
      const suppliedId = request.headers.get("idempotency-key");
      if (suppliedId && !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(suppliedId))
        throw new ContactError("Invalid submission identifier.", 400);
      const id = suppliedId?.toLowerCase() || requestId;
      const enquiry = parsed.value;
      const store = await deps.store();
      await store.limit(clientIdentity(request.headers, !!deps.vercel, deps.trustedIpHeader), enquiry.email);
      if (!deps.configured()) throw new ContactError("Mail is not configured yet.", 500);
      const payload: EmailPayload = {
        from: deps.from, to: [deps.to], reply_to: enquiry.email,
        subject: subjectFor(enquiry), text: textFor(enquiry), html: htmlFor(enquiry),
      };
      if (!(await store.reserve(id, JSON.stringify(payload)))) {
        await deps.send(payload, id);
        await store.markSent(id);
      }
      return json({ ok: true });
    } catch (error) {
      const known = error instanceof ContactError;
      if (!known || error.status >= 500)
        console.error("[contact] Request failed", { requestId, status: known ? error.status : 503 });
      return json({ ok: false, error: known ? error.message : "The service is unavailable. Please try again." },
        known ? error.status : 503, known ? error.retryAfter : undefined);
    }
  };
}
