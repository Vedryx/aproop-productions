import { timingSafeEqual } from "node:crypto";
import { reconcileBatch } from "@/lib/payments/service";
import { failure, HttpError, json } from "@/lib/admin/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  try {
    const expected = process.env.CRON_SECRET,
      actual = request.headers.get("authorization");
    if (
      !expected ||
      !actual ||
      Buffer.byteLength(actual) !== Buffer.byteLength(`Bearer ${expected}`) ||
      !timingSafeEqual(Buffer.from(actual), Buffer.from(`Bearer ${expected}`))
    )
      throw new HttpError("Unauthorized.", 401);
    return json({ checked: await reconcileBatch(undefined, 6) });
  } catch (e) {
    return failure(e);
  }
}
