"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FundingView } from "@/lib/payments/model";
import type { AdminProject } from "@/lib/admin/schema";
import { fmtINR } from "@/lib/producer";
import { launchCheckout, saveAccess } from "./checkout";
export default function ContributionForm({
  project,
  funding,
  amount,
  onClose,
}: {
  project: AdminProject;
  funding: FundingView;
  amount: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [agreedFunding] = useState(funding);
  const dialog = useRef<HTMLDialogElement>(null);
  const retry = useRef<{
    body: string;
    requestId: string;
    accessToken: string;
  } | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [orderId, setOrderId] = useState("");
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const fields = {
      projectId: project.id,
      amount: String(amount),
      name: String(form.get("name")),
      email: String(form.get("email")),
      phone: String(form.get("phone")),
      creditName: String(form.get("creditName") || ""),
      acceptedTerms: form.get("terms") === "on",
      termsVersion: agreedFunding.termsVersion,
    };
    const body = JSON.stringify(fields);
    if (retry.current?.body !== body) {
      const random = crypto.getRandomValues(new Uint8Array(32));
      retry.current = {
        body,
        requestId: crypto.randomUUID(),
        accessToken: [...random]
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(""),
      };
    }
    const { requestId, accessToken } = retry.current;
    const id = `aproop_${requestId.replaceAll("-", "")}`;
    try {
      // Save the lookup token before the request: a lost response is recoverable.
      saveAccess(id, accessToken);
      setOrderId(id);
      const response = await fetch("/api/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, requestId, accessToken }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Could not start checkout.");
      if (result.paymentSessionId && result.canRetry)
        await launchCheckout(result.paymentSessionId, result.mode);
      else router.push(`/contributions/status?order_id=${id}`);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "We couldn’t confirm this checkout. Check its status before trying again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      className="contribution-dialog"
      ref={dialog}
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
      onClose={onClose}
      aria-labelledby="contribution-heading"
    >
      <div className="contribution-dialog-head">
        <span>BE THE PRODUCER</span>
        <button
          type="button"
          aria-label="Close contribution form"
          onClick={onClose}
          disabled={busy}
        >
          ×
        </button>
      </div>
      <h2 id="contribution-heading">Back this story.</h2>
      <p>{project.title}</p>
      <div className="contribution-total">
        <span>Your contribution</span>
        <strong>{fmtINR(amount)}</strong>
      </div>
      {agreedFunding.mode === "sandbox" && (
        <p className="payment-note">
          Test checkout · No real money is collected.
        </p>
      )}
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <label>
            Full name
            <input
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={120}
            />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={200}
            />
          </label>
          <label>
            Mobile number
            <input
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="10-digit Indian mobile number"
              required
              pattern="[6-9][0-9]{9}"
              maxLength={10}
            />
          </label>
          <label>
            Name in credits (optional)
            <input
              name="creditName"
              maxLength={120}
              placeholder="Defaults to your full name"
            />
          </label>
          <details className="contribution-terms" open>
            <summary>Contribution & refund terms</summary>
            <p>{agreedFunding.terms}</p>
          </details>
          <label className="payment-consent">
            <input type="checkbox" name="terms" required />
            <span>
              I have read and accept these contribution and refund terms.
            </span>
          </label>
        </fieldset>
        {error && (
          <p role="alert" className="payment-error">
            {error}
          </p>
        )}
        {error && orderId && (
          <a
            className="payment-link"
            href={`/contributions/status?order_id=${orderId}`}
          >
            Check this checkout’s status ↗
          </a>
        )}
        <button
          className="payment-primary"
          disabled={busy || !funding.checkoutAvailable}
        >
          {busy
            ? "Opening secure checkout…"
            : `Continue to pay ${fmtINR(amount)}`}
        </button>
        <p className="payment-help">
          You’ll complete payment on Cashfree. Your contribution is confirmed
          only after payment verification.
        </p>
      </form>
    </dialog>
  );
}
