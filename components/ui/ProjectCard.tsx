"use client";

import { useState } from "react";
import { fmtINR, formatClosingDate } from "@/lib/producer";
import type { AdminProject } from "@/lib/admin/schema";
import SafeImg from "@/components/ui/SafeImg";
import type { FundingView } from "@/lib/payments/model";
import ContributionForm from "@/components/payments/ContributionForm";

const META_LABEL =
  "mb-1.5 text-[11px] uppercase tracking-[0.22em] text-muted-3";
const META_VALUE = "text-sm text-muted-2";
const PANEL_LABEL = "mb-2 text-[11px] uppercase tracking-[0.22em] text-muted";

export default function ProjectCard({
  project: original,
  funding,
}: {
  project: AdminProject;
  funding?: FundingView;
}) {
  const p = {
    ...original,
    need: funding ? funding.goalPaise / 100 : original.need,
    raised: funding ? funding.raisedPaise / 100 : original.raised,
    backers: funding?.backers ?? original.backers,
  };
  const [amount, setAmount] = useState(
    p.options[Math.min(1, p.options.length - 1)],
  );
  const [customOpen, setCustomOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const pct = Math.min(100, Math.round((p.raised / p.need) * 100));
  const maximum = (funding?.maxPaise ?? 0) / 100;
  const minimum = (funding?.minPaise ?? 10000) / 100;
  const validAmount =
    Number.isFinite(amount) &&
    Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001 &&
    amount >= minimum &&
    amount <= maximum;
  const messages: Record<string, string> = {
    setup: "Online contributions will open soon.",
    funded: "Fully funded. Thank you for bringing this story to life!",
    closed: "Contributions for this project are closed.",
    paused: "Contributions are temporarily paused.",
    reserved:
      "The remaining funds are reserved by checkouts in progress. Please check again shortly.",
  };

  return (
    <article
      id={`story-${p.id}`}
      style={{ scrollMarginTop: 100 }}
      className="bp-card grid grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] border border-[rgba(244,239,228,.1)] bg-panel"
    >
      <div className="flex min-w-0 flex-col">
        <div className="relative aspect-video overflow-hidden border-b border-[rgba(244,239,228,.09)] bg-ink-darker">
          <SafeImg
            src={p.poster}
            alt={p.ph}
            className="absolute inset-0 block h-full w-full object-cover"
          />
          <span className="absolute left-0 top-[18px] border-l-2 border-gold bg-[rgba(19,18,17,.88)] px-3 py-[7px] text-[11px] uppercase tracking-[0.22em] text-gold-soft">
            {p.kind}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-4 p-[clamp(24px,2.6vw,40px)]">
          <h2 className="m-0 font-display text-[clamp(28px,2.6vw,42px)] font-medium leading-[1.1] text-cream-2">
            {p.title}
          </h2>
          <p className="m-0 text-[15px] font-light leading-[1.75] text-muted">
            {p.synopsis}
          </p>
          <div className="mt-auto flex flex-wrap gap-[clamp(16px,2vw,32px)] border-t border-[rgba(244,239,228,.08)] pt-[18px]">
            <div>
              <div className={META_LABEL}>Director</div>
              <div className={META_VALUE}>{p.director}</div>
            </div>
            <div>
              <div className={META_LABEL}>Stage</div>
              <div className={META_VALUE}>{p.stage}</div>
            </div>
            <div>
              <div className={META_LABEL}>Closes</div>
              <div className={META_VALUE}>{formatClosingDate(p.closes)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-[clamp(20px,2vw,28px)] border-l border-[rgba(244,239,228,.09)] bg-[#171614] p-[clamp(24px,2.6vw,40px)]">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className={PANEL_LABEL}>Raised so far</div>
            <div className="font-display text-[clamp(30px,2.8vw,44px)] leading-none text-gold tabular-nums">
              {fmtINR(p.raised)}
            </div>
          </div>
          <div className="text-right">
            <div className={PANEL_LABEL}>Total needed</div>
            <div className="font-display text-[clamp(20px,1.8vw,28px)] leading-none text-cream-2 tabular-nums">
              {fmtINR(p.need)}
            </div>
          </div>
        </div>

        <div>
          <div
            className="relative h-[5px] bg-[rgba(217,178,60,.2)]"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${p.title} funding progress`}
          >
            <div
              className="absolute inset-y-0 left-0 bg-gold shadow-[0_0_14px_rgba(217,178,60,.5)]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2.5 flex justify-between text-[11px] uppercase tracking-[0.16em] text-muted-3 tabular-nums">
            <span className="text-gold">{pct}% funded</span>
            <span>{p.backers} producers on board</span>
          </div>
        </div>

        {funding?.checkoutAvailable ? (
          <>
            <div>
              <div className="mb-3 text-[11px] uppercase tracking-[0.22em] text-muted">
                Be a part of it
              </div>
              <div className="flex flex-wrap gap-2.5">
                {p.options.map((value) => (
                  <button
                    key={value}
                    type="button"
                    disabled={value < minimum || value > maximum}
                    aria-pressed={!customOpen && amount === value}
                    onClick={() => {
                      setAmount(value);
                      setCustomOpen(false);
                    }}
                    className={`min-h-11 border border-gold px-4 py-3 text-sm disabled:opacity-30 ${!customOpen && amount === value ? "bg-gold text-ink" : "text-gold"}`}
                  >
                    {fmtINR(value)}
                  </button>
                ))}
                <button
                  type="button"
                  aria-pressed={customOpen}
                  onClick={() => setCustomOpen(true)}
                  className="min-h-11 border border-gold px-4 py-3 text-sm text-gold"
                >
                  Custom
                </button>
                {!p.options.some((v) => v >= minimum && v <= maximum) && (
                  <button
                    type="button"
                    onClick={() => {
                      setAmount(maximum);
                      setCustomOpen(true);
                    }}
                    className="min-h-11 border border-gold px-4 py-3 text-sm text-gold"
                  >
                    Contribute remaining {fmtINR(maximum)}
                  </button>
                )}
              </div>
            </div>
            {customOpen && (
              <label className="text-sm text-muted">
                Your amount (₹)
                <input
                  className="payment-amount-input mt-2"
                  aria-label="Custom contribution amount"
                  type="number"
                  inputMode="decimal"
                  min={minimum}
                  max={maximum}
                  step={0.01}
                  value={Number.isNaN(amount) ? "" : amount}
                  onChange={(e) =>
                    setAmount(
                      e.target.value === "" ? NaN : Number(e.target.value),
                    )
                  }
                />
              </label>
            )}
            <p className="text-xs text-muted">
              Available now: {fmtINR(funding.availablePaise / 100)}
              {funding.reservedPaise > 0
                ? ` · ${fmtINR(funding.reservedPaise / 100)} in other checkouts`
                : ""}
            </p>
            {!validAmount && (
              <p className="text-sm text-gold">
                Choose an amount (up to two decimal places) between{" "}
                {fmtINR(minimum)} and {fmtINR(maximum)}.
              </p>
            )}
            <button
              type="button"
              disabled={!validAmount}
              onClick={() => setCheckout(true)}
              className="payment-primary mt-auto"
            >
              Contribute {Number.isFinite(amount) ? fmtINR(amount) : ""} ↗
            </button>
            <p className="text-xs leading-relaxed text-muted">
              Secure checkout with Cashfree. Review this project’s contribution
              and refund terms before paying.
            </p>
          </>
        ) : (
          <p className="payment-unavailable" role="status">
            {funding
              ? messages[funding.status] ||
                (funding.availablePaise < 100
                  ? "The remaining amount is below the ₹1 minimum for online payments."
                  : "Online contributions are currently unavailable.")
              : "Checking contribution availability…"}
          </p>
        )}
        {checkout && funding && (
          <ContributionForm
            project={p}
            funding={funding}
            amount={amount}
            onClose={() => setCheckout(false)}
          />
        )}
      </div>
    </article>
  );
}
