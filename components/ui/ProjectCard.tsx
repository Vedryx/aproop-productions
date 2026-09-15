"use client";

import { useState } from "react";
import { fmtINR } from "@/lib/producer";
import type { AdminProject } from "@/lib/admin/schema";
import SafeImg from "@/components/ui/SafeImg";

const META_LABEL =
  "mb-1.5 text-[11px] uppercase tracking-[0.22em] text-muted-3";
const META_VALUE = "text-sm text-muted-2";
const PANEL_LABEL = "mb-2 text-[11px] uppercase tracking-[0.22em] text-muted";

export default function ProjectCard({ project: p }: { project: AdminProject }) {
  // The design opens on the second tier (₹10,000) and seeds Custom at ₹25,000.
  const [pick, setPick] = useState(Math.min(1, p.options.length - 1));
  const [custom, setCustom] = useState(25000);

  const customOpen = pick === p.options.length;
  const amount = customOpen ? custom : p.options[pick];
  const pct = Math.min(100, Math.round((p.raised / p.need) * 100));
  const tiers = [...p.options.map(fmtINR), "Custom"];

  const subject = `Producing “${p.title}” — ${fmtINR(amount)}`;
  const body = `Hi Aproop team,\n\nI'd like to contribute ${fmtINR(
    amount,
  )} to “${p.title}”. Please share the payment details and next steps.\n\nName:\nPhone:`;
  const payHref = `mailto:aproop.production22@gmail.com?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;

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
              <div className={META_VALUE}>{p.closes}</div>
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

        <div>
          <div className="mb-3 text-[11px] uppercase tracking-[0.22em] text-muted">
            Be a part of it
          </div>
          <div className="flex flex-wrap gap-2.5">
            {tiers.map((label, ti) => {
              const on = pick === ti;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setPick(ti)}
                  aria-pressed={on}
                  className={`min-h-11 cursor-pointer border border-[rgba(217,178,60,.45)] px-[18px] py-3 text-[13px] tracking-[0.06em] tabular-nums transition-all duration-300 ${
                    on
                      ? "-translate-y-0.5 bg-gold text-ink"
                      : "bg-transparent text-gold-soft hover:bg-[rgba(217,178,60,.12)]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {customOpen && (
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[11px] uppercase tracking-[0.22em] text-muted-3">
                Your amount
              </span>
              <span className="font-display text-[clamp(24px,2.2vw,34px)] leading-none text-gold tabular-nums">
                {fmtINR(custom)}
              </span>
            </div>
            <input
              className="ap-range"
              type="range"
              min={1000}
              max={200000}
              step={1000}
              value={custom}
              onChange={(e) => setCustom(+e.target.value)}
              style={
                {
                  "--fill": `${(((custom - 1000) / 199000) * 100).toFixed(1)}%`,
                } as React.CSSProperties
              }
              aria-label="Custom contribution amount"
            />
            <div className="flex justify-between text-[11px] uppercase tracking-[0.16em] text-[#6f6a63]">
              <span>₹1,000</span>
              <span>₹2,00,000</span>
            </div>
          </div>
        )}

        <a
          href={payHref}
          className="mt-auto flex items-center justify-center gap-4 bg-gold px-7 py-5 text-center text-[12.5px] font-semibold uppercase tracking-[0.22em] text-ink transition-all duration-300 hover:-translate-y-[3px] hover:bg-gold-light hover:text-ink"
        >
          Contribute {fmtINR(amount)} <span className="text-sm">↗</span>
        </a>

        <p className="m-0 text-[12px] font-light leading-[1.6] text-[#6f6a63]">
          Every contribution gets a producer credit, a first-cut screening
          invite, and a signed script page. We&apos;ll share payment details and
          paperwork over email.
        </p>
      </div>
    </article>
  );
}
