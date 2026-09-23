"use client";
import { useEffect, useState } from "react";
import { fmtINR } from "@/lib/producer";
import { launchCheckout, readAccess } from "./checkout";
type Status = {
  orderId: string;
  projectId: string;
  projectTitle: string;
  amountPaise: number;
  refundedPaise: number;
  status: string;
  mode: "sandbox" | "production";
  expiresAt: string;
  paymentId: string | null;
  canRetry: boolean;
  paymentSessionId: string | null;
};
export default function PaymentStatus({ orderId }: { orderId: string }) {
  const [data, setData] = useState<Status | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [poll, setPoll] = useState(0);
  useEffect(() => {
    let active = true,
      attempt = 0,
      timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function refresh() {
      try {
        const token = await Promise.resolve(readAccess(orderId));
        if (!token)
          throw new Error(
            "Open this page in the browser where you started the contribution. If you need help, contact Aproop with the reference below.",
          );
        const response = await fetch(`/api/contributions/${orderId}`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (!active) return;
        setData(result);
        setError("");
        if (
          ["creating", "pending", "refund_pending"].includes(result.status) &&
          attempt++ < 20
        )
          timer = setTimeout(refresh, Math.min(15000, 3000 + attempt * 1000));
      } catch (e) {
        if (active)
          setError(
            e instanceof Error
              ? e.message
              : "Unable to check payment. Please try again.",
          );
      }
    }
    void refresh();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [orderId, poll]);
  const paid = data?.status === "paid";
  const titles: Record<string, string> = {
    paid: "You’re part of the story.",
    pending: "Checking your payment.",
    creating: "Your checkout is being prepared.",
    expired: "This checkout has closed.",
    refund_pending: "Your payment is being refunded.",
    refunded: "Your contribution was refunded.",
    review: "Your payment needs a closer look.",
  };
  return (
    <section className="payment-status">
      <p className="payment-eyebrow">APROOP / CONTRIBUTION</p>
      <h1>
        {data
          ? titles[data.status] || "Checking your contribution."
          : "Checking your contribution."}
      </h1>
      {data && (
        <>
          <p className="payment-project">{data.projectTitle}</p>
          <div className="contribution-total">
            <span>
              {paid ? "Confirmed contribution" : "Contribution amount"}
            </span>
            <strong>{fmtINR(data.amountPaise / 100)}</strong>
          </div>
          {data.mode === "sandbox" && (
            <p className="payment-note">
              Sandbox payment · This is a test contribution.
            </p>
          )}
          {paid ? (
            <p>
              Thank you for backing this project. Keep this reference for your
              records.
            </p>
          ) : data.status === "expired" ? (
            <p>
              No payment has been confirmed for this checkout. You can start
              again if the project is still accepting contributions.
            </p>
          ) : data.status === "refund_pending" ? (
            <p>
              This payment could not be allocated to the project. A refund is
              being processed; it is not counted toward the funding goal.
            </p>
          ) : data.status === "refunded" ? (
            <p>
              The refund has been confirmed by Cashfree. Bank processing times
              may vary.
            </p>
          ) : data.status === "review" ? (
            <p>
              Please avoid paying again. Contact Aproop using the reference
              below while we verify this payment.
            </p>
          ) : (
            <p>
              Please don’t make another payment while we verify this one. A bank
              debit or a return from checkout alone does not confirm your
              contribution.
            </p>
          )}
          {data.refundedPaise > 0 && (
            <p>Refunded: {fmtINR(data.refundedPaise / 100)}</p>
          )}
        </>
      )}
      <p className="payment-reference">
        Reference <code>{orderId}</code>
      </p>
      {data?.paymentId && (
        <p className="payment-reference">
          Cashfree payment <code>{data.paymentId}</code>
        </p>
      )}
      {error && (
        <p role="alert" className="payment-error">
          {error}
        </p>
      )}
      <div className="payment-actions">
        {data?.canRetry && data.paymentSessionId && (
          <button
            className="payment-primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await launchCheckout(data.paymentSessionId!, data.mode);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Checkout could not open.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            Resume this checkout
          </button>
        )}
        {!paid && data?.status !== "refunded" && (
          <button onClick={() => setPoll((v) => v + 1)}>
            Check status again
          </button>
        )}
        {paid && (
          <button onClick={() => window.print()}>Print confirmation</button>
        )}
        <a href={`/be-the-producer${data ? `#story-${data.projectId}` : ""}`}>
          Back to projects ↗
        </a>
      </div>
      <a
        className="payment-help"
        href={`mailto:aproop.production22@gmail.com?subject=${encodeURIComponent(`Contribution ${orderId}`)}`}
      >
        Need help? Contact Aproop
      </a>
    </section>
  );
}
