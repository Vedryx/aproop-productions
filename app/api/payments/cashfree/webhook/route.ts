import { createHash } from "node:crypto";
import { validSignature } from "@/lib/payments/provider";
import { collections } from "@/lib/payments/store";
import { reconcileOrder } from "@/lib/payments/service";
import { failure, HttpError, json } from "@/lib/admin/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length")) > 100000)
      throw new HttpError("Payload too large.", 413);
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (!reader) throw new HttpError("Payload required.", 400);
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 100000) {
        await reader.cancel();
        throw new HttpError("Payload too large.", 413);
      }
      chunks.push(value);
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    if (
      !validSignature(
        raw,
        request.headers.get("x-webhook-timestamp"),
        request.headers.get("x-webhook-signature"),
      )
    )
      throw new HttpError("Invalid webhook signature.", 401);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new HttpError("Invalid JSON.", 400);
    }
    const orderId =
      body?.data?.order?.order_id ||
      body?.data?.refund?.order_id ||
      body?.data?.order_id;
    if (typeof orderId !== "string" || !/^aproop_[a-f0-9]{32}$/.test(orderId))
      return json({ received: true });
    // Signed notifications trigger an authenticated provider lookup. Payloads alone
    // never credit funds, so forged totals and out-of-order events cannot change money.
    const result = await reconcileOrder(orderId);
    if (result?.lastError)
      throw new HttpError(
        "Verification is temporarily unavailable. Retry delivery.",
        503,
      );
    const { db } = await collections();
    const eventId = createHash("sha256").update(raw).digest("hex");
    await db
      .collection<{
        _id: string;
        orderId: string;
        type: string;
        receivedAt: Date;
      }>("payment_events")
      .updateOne(
        { _id: eventId },
        {
          $setOnInsert: {
            orderId,
            type: String(body.type || "unknown").slice(0, 80),
            receivedAt: new Date(),
          },
        },
        { upsert: true },
      );
    return json({ received: true });
  } catch (e) {
    return failure(e);
  }
}
