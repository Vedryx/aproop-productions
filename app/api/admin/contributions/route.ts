import { getSession } from "@/lib/admin/auth";
import { collections } from "@/lib/payments/store";
import { reconcileOrder, reconcileBatch } from "@/lib/payments/service";
import { paymentReady, paymentMode } from "@/lib/payments/config";
import {
  failure,
  HttpError,
  json,
  readJson,
  sameOrigin,
} from "@/lib/admin/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  try {
    if (!(await getSession()))
      throw new HttpError("Please sign in again.", 401);
    const { contributions, campaigns } = await collections();
    const page = Math.max(
      0,
      Math.min(
        100000,
        Number(new URL(request.url).searchParams.get("page")) || 0,
      ),
    );
    const rows = await contributions
      .find({})
      .sort({ createdAt: -1 })
      .skip(Math.floor(page) * 30)
      .limit(30)
      .toArray();
    return json({
      ready: paymentReady(),
      mode: paymentMode(),
      openingPolicy:
        process.env.CONTRIBUTION_OPENING_BALANCE_POLICY || "unconfirmed",
      campaigns: await campaigns.find({}).toArray(),
      total: await contributions.countDocuments(),
      rows: rows.map(
        ({
          _id,
          projectTitle,
          projectId,
          amountPaise,
          refundedPaise,
          name,
          email,
          creditName,
          state,
          createdAt,
          paymentId,
          reservationActive,
          reviewReason,
          environment,
        }) => ({
          orderId: _id,
          projectTitle,
          projectId,
          amountPaise,
          refundedPaise,
          name,
          email,
          creditName,
          state,
          createdAt,
          paymentId,
          reservationActive,
          reviewReason,
          environment,
        }),
      ),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    if (!(await getSession()))
      throw new HttpError("Please sign in again.", 401);
    const body = await readJson(request, 1024);
    if (body && typeof body === "object" && "orderId" in body) {
      const id = body.orderId;
      if (typeof id !== "string" || !/^aproop_[a-f0-9]{32}$/.test(id))
        throw new HttpError("Invalid order.", 400);
      await reconcileOrder(id);
      return json({ checked: 1 });
    }
    return json({ checked: await reconcileBatch(undefined, 6) });
  } catch (e) {
    return failure(e);
  }
}
