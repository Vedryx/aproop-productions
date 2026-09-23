"use client";

import { useState } from "react";
import { faqData } from "@/lib/data";
import Eyebrow from "@/components/ui/Eyebrow";

export default function Faq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section
      id="faq"
      data-screen-label="FAQ"
      className="mx-auto max-w-1320px px-[clamp(20px,4vw,56px)] pb-[clamp(80px,9vw,140px)] pt-[clamp(60px,7vw,110px)]"
    >
      <Eyebrow
        top="07 / Before you ask"
        bottom="07 / FAQ"
        className="mb-[clamp(20px,3vw,34px)]"
      />
      <h2
        data-reveal=""
        className="m-0 mb-[clamp(30px,4vw,54px)] font-display text-[clamp(36px,4.6vw,68px)] font-normal leading-[1.05] text-cream-2"
      >
        Frequently asked
        <br />
        <em className="italic text-gold">questions.</em>
      </h2>

      <div className="border-t border-[rgba(217,178,60,.28)]">
        {faqData.map((f, i) => {
          const open = openIdx === i;
          return (
            <div key={f.q} className="border-b border-[rgba(217,178,60,.28)]">
              <button
                type="button"
                onClick={() => setOpenIdx(open ? null : i)}
                aria-expanded={open}
                className="flex w-full cursor-pointer items-baseline gap-[clamp(14px,2vw,26px)] border-none bg-transparent px-1 py-[clamp(18px,2.2vw,26px)] text-left font-body transition-colors duration-300 hover:bg-[rgba(217,178,60,.05)]"
                style={{ boxSizing: "border-box" }}
              >
                <span className="flex-none text-[11px] tracking-[0.2em] text-rust tabular-nums">
                  {`0${i + 1}`}
                </span>
                <span
                  className="flex-1 font-display text-[clamp(18px,1.7vw,24px)] leading-tight transition-colors duration-300"
                  style={{ color: open ? "#d9b23c" : "#f6f1e6" }}
                >
                  {f.q}
                </span>
                <span
                  aria-hidden="true"
                  className="flex h-8.5 w-8.5 flex-none items-center justify-center self-center border border-[rgba(217,178,60,.5)] text-[17px] font-light leading-none text-gold transition-all duration-500 transition-timing-function:cubic-bezier(.2,.7,.2,1)"
                  style={{
                    transform: open ? "rotate(45deg)" : "none",
                    background: open ? "rgba(217,178,60,.14)" : "transparent",
                  }}
                >
                  +
                </span>
              </button>

              <div
                className="grid transition-[grid-template-rows] duration-550ms transition-timing-function:cubic-bezier(.25,.8,.25,1)"
                style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <p
                    className="m-0 max-w-[90ch] whitespace-pre-line px-1 pb-[clamp(22px,2.6vw,30px)] pt-0.5 text-[14.5px] font-light leading-[1.75] text-muted transition-all"
                    style={{
                      paddingLeft: "calc(clamp(14px,2vw,26px) + 22px)",
                      opacity: open ? 1 : 0,
                      transform: open ? "none" : "translateY(-8px)",
                      transitionDuration: "500ms",
                    }}
                  >
                    {f.a}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
