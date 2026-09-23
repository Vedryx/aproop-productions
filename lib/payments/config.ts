import "server-only";
import { HttpError } from "@/lib/admin/http";
export function paymentMode(): "sandbox" | "production" {
  return process.env.CASHFREE_ENV === "production" ? "production" : "sandbox";
}
export function paymentReady() {
  return (
    !!process.env.CASHFREE_CLIENT_ID &&
    !!process.env.CASHFREE_CLIENT_SECRET &&
    (paymentMode() !== "production" ||
      process.env.CASHFREE_LIVE_ENABLED === "true")
  );
}
export function paymentConfig() {
  if (!paymentReady())
    throw new HttpError(
      "Online contributions are not available yet. Please check back soon.",
      503,
    );
  const origin = process.env.APP_ORIGIN;
  if (
    !origin ||
    (paymentMode() === "production" && !origin.startsWith("https://"))
  )
    throw new Error("Payment origin is not configured");
  return {
    mode: paymentMode(),
    origin,
    id: process.env.CASHFREE_CLIENT_ID!,
    secret: process.env.CASHFREE_CLIENT_SECRET!,
    base:
      paymentMode() === "production"
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg",
  };
}
