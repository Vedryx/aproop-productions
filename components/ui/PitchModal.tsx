"use client";

import { useEffect, useRef } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useEnquiry } from "@/hooks/useEnquiry";
import Honeypot from "@/components/ui/Honeypot";

const FIELD =
  "w-full box-border bg-transparent border-0 border-b border-[rgba(244,239,228,.18)] text-cream text-[17px] pb-3.5 pt-2 transition-colors duration-300 focus:border-gold";
const LABEL = "block text-[11px] uppercase tracking-[0.24em] text-muted mb-3";

export default function PitchModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { status, error, submit, reset: resetStatus } = useEnquiry("pitch");
  const sent = status === "sent";
  const reset = useRef<number | null>(null);
  const sheet = useRef<HTMLDivElement>(null);

  useFocusTrap(open, sheet);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(
    () => () => {
      if (reset.current) window.clearTimeout(reset.current);
    },
    [],
  );

  return (
    <div
      data-open={open ? "yes" : "no"}
      className="bp-modal fixed inset-0 z-[90] flex items-center justify-center p-[clamp(16px,4vw,40px)]"
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className="bp-veil absolute inset-0 bg-[rgba(9,8,8,.72)] backdrop-blur-[3px] transition-opacity duration-[450ms]"
      />
      <div
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-label="Pitch your story"
        className="bp-sheet relative max-h-[88vh] w-full max-w-[620px] overflow-y-auto border border-[rgba(217,178,60,.3)] bg-panel p-[clamp(24px,3vw,42px)] transition-[opacity,transform] duration-[450ms]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3.5 top-3.5 flex h-11 min-h-11 w-11 min-w-11 cursor-pointer items-center justify-center border border-[rgba(244,239,228,.18)] bg-transparent text-base leading-none text-muted-2 transition-colors duration-300 hover:border-[rgba(217,178,60,.55)] hover:text-gold"
        >
          ✕
        </button>

        <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.26em] text-rust">
          Pitch your story
        </div>
        <div className="mb-[26px] font-display text-[clamp(26px,2.6vw,36px)] leading-[1.1] text-cream-2">
          Tell us what you&apos;re
          <br />
          <em className="italic text-gold">making</em>.
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            // Only dismiss once it actually sent; a failure has to stay on
            // screen or the message is lost with no way to tell.
            void submit(e.currentTarget).then((ok) => {
              if (!ok) return;
              if (reset.current) window.clearTimeout(reset.current);
              reset.current = window.setTimeout(() => {
                onClose();
                resetStatus();
              }, 1600);
            });
          }}
          className="flex flex-col gap-[22px]"
        >
          <Honeypot />
          <label className="block">
            <span className={LABEL}>Name</span>
            <input type="text" name="name" placeholder="Your name" className={FIELD} />
          </label>
          <label className="block">
            <span className={LABEL}>Email</span>
            <input
              type="email"
              name="email"
              placeholder="you@email.com"
              className={FIELD}
            />
          </label>
          <label className="block">
            <span className={LABEL}>What are we making?</span>
            <select name="kind" className={FIELD}>
              <option className="bg-panel">Advertising film</option>
              <option className="bg-panel">Documentary</option>
              <option className="bg-panel">Song / jingle</option>
              <option className="bg-panel">Short film</option>
              <option className="bg-panel">Something else entirely</option>
            </select>
          </label>
          <label className="block">
            <span className={LABEL}>Tell us a little</span>
            <textarea
              name="note"
              rows={3}
              placeholder="The idea, the feeling, the impossible deadline…"
              className={`${FIELD} resize-y`}
            />
          </label>
          <button
            type="submit"
            disabled={status === "sending"}
            className="flex cursor-pointer items-center justify-center gap-4 border-none bg-gold p-5 text-[12.5px] font-semibold uppercase tracking-[0.22em] text-ink transition-all duration-300 hover:-translate-y-[3px] hover:bg-gold-light disabled:cursor-wait disabled:opacity-70"
          >
            {status === "sending"
              ? "Sending…"
              : sent
                ? "Sent — we'll write back"
                : "Get your first draft"}
            <svg
              viewBox="0 0 24 24"
              className="h-[17px] w-[17px]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M22 2 L11 13 M22 2 L15 22 L11 13 L2 9 Z" />
            </svg>
          </button>
          {status === "error" && (
            <p role="alert" className="m-0 text-[13px] leading-[1.6] text-rust">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
