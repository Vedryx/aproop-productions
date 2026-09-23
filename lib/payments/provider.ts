import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { paymentConfig } from "./config";
import type { Contribution } from "./model";
export class ProviderError extends Error {
  constructor(public status: number) {
    super("Cashfree request could not be confirmed");
  }
}
export type ProviderOrder = {
  order_id: string;
  cf_order_id: string;
  order_amount: number;
  order_currency: string;
  order_status: string;
  payment_session_id?: string;
};
export type ProviderPayment = {
  cf_payment_id: string;
  order_id: string;
  payment_amount: number;
  payment_currency: string;
  payment_status: string;
  is_captured?: boolean;
};
export type ProviderRefund = {
  cf_refund_id: string;
  order_id: string;
  refund_amount: number;
  refund_currency: string;
  refund_status: string;
};
async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  key?: string,
): Promise<T> {
  const c = paymentConfig();
  const response = await fetch(c.base + path, {
    method,
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
    headers: {
      "Content-Type": "application/json",
      "x-client-id": c.id,
      "x-client-secret": c.secret,
      "x-api-version": "2026-01-01",
      ...(key ? { "x-idempotency-key": key } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new ProviderError(response.status);
  return response.json();
}
export const getOrder = (id: string) =>
  request<ProviderOrder>(`/orders/${encodeURIComponent(id)}`);
export const getPayments = (id: string) =>
  request<ProviderPayment[]>(`/orders/${encodeURIComponent(id)}/payments`);
export const getRefunds = (id: string) =>
  request<ProviderRefund[]>(`/orders/${encodeURIComponent(id)}/refunds`);
export const terminateOrder = (id: string) =>
  request<ProviderOrder>(`/orders/${encodeURIComponent(id)}`, "PATCH", {
    order_status: "TERMINATED",
  });
export function createOrder(c: Contribution) {
  const config = paymentConfig();
  return request<ProviderOrder>(
    "/orders",
    "POST",
    {
      order_id: c._id,
      order_amount: c.amountPaise / 100,
      order_currency: "INR",
      order_expiry_time: c.expiresAt.toISOString(),
      customer_details: {
        customer_id: c.emailHash.slice(0, 40),
        customer_name: c.name,
        customer_email: c.email,
        customer_phone: c.phone,
      },
      order_meta: {
        return_url: `${config.origin}/contributions/status?order_id=${c._id}`,
        ...(config.origin.startsWith("https://")
          ? { notify_url: `${config.origin}/api/payments/cashfree/webhook` }
          : {}),
      },
      order_note: `Contribution to ${c.projectTitle}`.slice(0, 200),
    },
    c.requestId,
  );
}
export function refundUnallocated(c: Contribution) {
  return request<ProviderRefund>(
    `/orders/${c._id}/refunds`,
    "POST",
    {
      refund_id: `capacity_${c.requestId.replaceAll("-", "")}`,
      refund_amount: c.amountPaise / 100,
      refund_note: "Contribution capacity was no longer available",
      refund_speed: "STANDARD",
    },
    c.requestId,
  );
}
export function validSignature(
  raw: string,
  timestamp: string | null,
  signature: string | null,
) {
  const secret = process.env.CASHFREE_CLIENT_SECRET;
  if (!secret || !timestamp || !signature || !/^\d{10,16}$/.test(timestamp))
    return false;
  // Authentic delayed retries are safe: contribution/payment transitions are idempotent.
  // Reject only timestamps implausibly in the future, not delayed deliveries.
  const time = Number(timestamp) * (timestamp.length === 10 ? 1000 : 1);
  if (!Number.isFinite(time) || time > Date.now() + 300000) return false;
  const expected = createHmac("sha256", secret)
    .update(timestamp + raw)
    .digest();
  const got = Buffer.from(signature, "base64");
  return got.length === expected.length && timingSafeEqual(got, expected);
}
