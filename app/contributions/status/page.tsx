import type { Metadata } from "next";
import PaymentStatus from "@/components/payments/PaymentStatus";
import "@/components/payments/payments.css";
export const metadata: Metadata = {
  title: "Contribution status · Aproop",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>;
}) {
  const { order_id } = await searchParams;
  return (
    <main>
      <PaymentStatus
        orderId={
          /^aproop_[a-f0-9]{32}$/.test(order_id || "") ? order_id! : "unknown"
        }
      />
    </main>
  );
}
