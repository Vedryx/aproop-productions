"use client";

import { useState } from "react";
import Eyebrow from "@/components/ui/Eyebrow";

const FIELD =
  "w-full box-border bg-transparent border-0 border-b border-[rgba(244,239,228,.18)] text-cream text-[17px] pb-3.5 pt-2 transition-colors duration-300 focus:border-gold";
const LABEL =
  "block text-[11px] uppercase tracking-[0.24em] text-muted mb-3";
const SOCIAL =
  "inline-flex min-h-11 items-center gap-2.5 py-3 text-[11.5px] uppercase tracking-[0.22em] text-muted-2 transition-colors duration-300 hover:text-gold";

export default function Contact() {
  const [sent, setSent] = useState(false);

  return (
    <section
      id="contact"
      data-screen-label="Contact"
      className="mx-auto grid max-w-[1320px] grid-cols-[minmax(0,.95fr)_minmax(0,1.05fr)] items-start gap-[clamp(30px,4vw,80px)] px-[clamp(20px,4vw,56px)] py-[clamp(70px,8vw,130px)]"
    >
      <div>
        <Eyebrow
          top="06 / Your turn"
          bottom="06 / Let's talk"
          className="mb-[clamp(20px,3vw,34px)]"
        />
        <h2
          data-reveal=""
          className="m-0 font-display text-[clamp(40px,5.6vw,84px)] font-normal leading-none text-cream-2"
        >
          Let&apos;s make something
          <br />
          <em className="italic text-gold">worth watching</em>
        </h2>

        <a
          href="mailto:hello@aproopproductions.com"
          className="mt-[clamp(30px,3.6vw,52px)] inline-flex items-center gap-3.5 border-b border-gold pb-2.5 font-display text-[clamp(22px,2.2vw,32px)] text-cream-2 hover:text-gold"
        >
          hello@aproopproductions.com{" "}
          <span className="text-base text-gold">↗</span>
        </a>

        <div className="mt-[clamp(32px,3.6vw,52px)] flex flex-wrap gap-[clamp(20px,2.4vw,34px)]">
          <a
            href="https://www.instagram.com/aproop.production"
            target="_blank"
            rel="noopener"
            className={SOCIAL}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-[17px] w-[17px] flex-none"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" />
            </svg>
            Instagram
          </a>
          <a
            href="https://youtube.com/@aproopproduction9812"
            target="_blank"
            rel="noopener"
            className={SOCIAL}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-[17px] w-[17px] flex-none"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <rect x="2" y="5" width="20" height="14" rx="4" />
              <path d="M10.5 9.2 L15 12 L10.5 14.8 Z" fill="currentColor" stroke="none" />
            </svg>
            YouTube
          </a>
          <a
            href="https://www.linkedin.com/company/aproop-productions-llp/"
            target="_blank"
            rel="noopener"
            className={SOCIAL}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-[17px] w-[17px] flex-none"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M7 10.5v6.5M7 7.6v.1M11.5 17v-6.5M11.5 13.4c0-1.6 1-2.4 2.2-2.4 1.3 0 2.3.8 2.3 2.6V17" />
            </svg>
            LinkedIn
          </a>
          <a
            href="https://wa.me/918624965472?text=Hi"
            target="_blank"
            rel="noopener"
            className={SOCIAL}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-[17px] w-[17px] flex-none"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M20.5 11.6a8.4 8.4 0 0 1-12.4 7.4L3.5 20.5l1.5-4.6a8.4 8.4 0 1 1 15.5-4.3Z" />
              <path
                d="M9 9.4c0 3 2.6 5.6 5.6 5.6.5 0 .9-.4.9-.9v-.8l-1.9-.7-.9 1c-1.2-.5-2.2-1.5-2.7-2.7l1-.9-.7-1.9h-.8c-.5 0-.9.4-.9.9Z"
                fill="currentColor"
                stroke="none"
              />
            </svg>
            WhatsApp
          </a>
        </div>
      </div>

      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute left-4 top-[22px] h-full w-full bg-gold"
        />
        <form
          data-reveal=""
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
          className="relative flex flex-col gap-[clamp(22px,2.4vw,32px)] border border-[rgba(217,178,60,.3)] bg-panel p-[clamp(26px,3vw,44px)]"
        >
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
              <option className="bg-panel">Cinematic reel</option>
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
            className="flex cursor-pointer items-center justify-center gap-4 border-none bg-gold p-[22px] text-[12.5px] font-semibold uppercase tracking-[0.22em] text-ink transition-all duration-300 hover:-translate-y-[3px] hover:bg-gold-light hover:shadow-[0_18px_36px_rgba(217,178,60,.3)]"
          >
            {sent ? "Thanks — we'll be in touch" : "Get your free draft"}
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
        </form>
      </div>
    </section>
  );
}
