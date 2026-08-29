"use client";

import { useState } from "react";
import { phases } from "@/lib/data";
import Eyebrow from "@/components/ui/Eyebrow";

export default function Services() {
  const [open, setOpen] = useState<Record<number, boolean>>({});

  const toggle = (i: number, el: HTMLElement) => {
    const wasOpen = !!open[i];
    // Replay the arcade "press" on the button before the list expands.
    el.style.transform = "translateY(6px)";
    el.style.boxShadow = "0 0 0 0 #a8781c";
    el.style.background = "#d9a93c";
    window.setTimeout(() => {
      el.style.transform = "translateY(0)";
      el.style.boxShadow = "0 6px 0 0 #a8781c";
      el.style.background = "#e0b040";
    }, 150);

    const grid = el.closest(".ap-phase")?.parentElement ?? null;
    window.setTimeout(() => {
      setOpen((s) => ({ ...s, [i]: !wasOpen }));
      if (wasOpen || !grid) return;
      requestAnimationFrame(() => {
        const target = window.scrollY + grid.getBoundingClientRect().top - 120;
        window.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
      });
    }, 170);
  };

  return (
    <section
      id="services"
      data-screen-label="Services"
      className="mx-auto max-w-[1320px] px-[clamp(20px,4vw,56px)] py-[clamp(50px,6vw,100px)]"
    >
      <div className="ap-2col mb-[clamp(44px,6vw,88px)] grid grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)] items-start gap-[clamp(24px,4vw,60px)]">
        <div>
          <Eyebrow
            top="02 / Your targets"
            bottom="02 / Our services"
            className="mb-[clamp(18px,2.4vw,30px)]"
          />
          <h2
            data-reveal=""
            className="m-0 font-display text-[clamp(40px,5.6vw,84px)] font-normal leading-none text-cream-2"
          >
            Good films aren&apos;t
            <br />
            <em className="italic text-gold">accidents.</em>
          </h2>
        </div>
        <p className="m-0 max-w-[34ch] text-[clamp(15px,1.2vw,18px)] font-light leading-[1.8] text-muted">
          Before the lights. Before the camera. There’s an idea. We take it from
          there.
        </p>
      </div>

      <div className="relative border-y border-[rgba(217,178,60,.28)]">
        <div className="ap-sgrid relative grid grid-cols-3 overflow-hidden">
          {phases.map((p, i) => {
            const isOpen = !!open[i];
            return (
              <div
                key={p.num}
                data-reveal=""
                className="ap-phase relative px-[clamp(24px,2.6vw,40px)] pb-[clamp(34px,4vw,56px)] pt-[clamp(28px,3vw,44px)]"
              >
                {i < phases.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute right-0 top-0 bottom-0 w-px bg-[rgba(217,178,60,.2)]"
                  />
                )}

                <div className="flex items-baseline justify-between gap-3.5">
                  <span className="text-[12px] tracking-[0.2em] text-gold tabular-nums">
                    {p.num}
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.22em] text-muted-3">
                    {p.stage}
                  </span>
                </div>

                <div className="relative flex h-[clamp(52px,6vw,84px)] items-center">
                  {i === 0 && (
                    <span
                      data-stroke=""
                      aria-hidden="true"
                      className="absolute left-[7px] top-1/2 -mt-px h-px w-[320%] bg-gold opacity-55"
                    />
                  )}
                  <span
                    data-dot=""
                    className="relative h-[15px] w-[15px] rounded-full border border-gold bg-ink"
                    style={{
                      boxShadow: "0 0 0 5px #131211, 0 0 22px rgba(217,178,60,.5)",
                    }}
                  />
                </div>

                <div className="mt-[clamp(26px,3vw,44px)] text-gold">
                  <svg
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                    className="block h-11 w-11"
                    style={{ animation: p.iconAnim }}
                  >
                    <path
                      d={p.icon}
                      fill="none"
                      stroke="#d9b23c"
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <h3 className="relative mb-3.5 mt-[clamp(22px,2.6vw,36px)]">
                  {i === 0 && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-[34%] flex items-start gap-1.5 transition-opacity duration-300"
                      style={{
                        bottom: "calc(100% - 8px)",
                        opacity: isOpen ? 0 : 1,
                      }}
                    >
                      <svg
                        width="40"
                        height="44"
                        viewBox="0 0 40 44"
                        fill="none"
                        stroke="#d9b23c"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ flex: "none", width: 35, height: 52 }}
                      >
                        <path d="M34 4 C33 20 26 33 12 39" />
                        <path d="M18 28 L11 39.5 L23 39" />
                      </svg>
                      <span className="whitespace-nowrap pt-1 font-display text-[15px] italic text-gold-soft">
                        click to reveal
                      </span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => toggle(i, e.currentTarget)}
                    aria-expanded={isOpen}
                    className="inline-block min-h-11 max-w-full cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border-none bg-amber px-[17px] pb-3 pt-[11px] font-display text-[clamp(19px,1.75vw,30px)] font-semibold leading-[1.08] text-[#1a1408] transition-[transform,box-shadow,background] duration-100 hover:bg-[#e8bd55]"
                    style={{ boxShadow: "0 6px 0 0 #a8781c", boxSizing: "border-box" }}
                  >
                    {p.title}
                  </button>
                </h3>

                <div className="mb-[18px] text-[11px] uppercase tracking-[0.22em] text-rust">
                  {p.kicker}
                </div>
                <p className="m-0 mb-[22px] max-w-[28ch] text-[15.5px] font-light leading-[1.75] text-muted">
                  {p.body}
                </p>

                <div
                  className="grid transition-[grid-template-rows] duration-500 [transition-timing-function:cubic-bezier(.2,.7,.2,1)]"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <ul className="m-0 flex list-none flex-col gap-[11px] overflow-hidden p-0 pb-1">
                    {p.items.map((it) => (
                      <li
                        key={it}
                        className="flex items-baseline gap-3 text-[14.5px] font-light leading-[1.5] text-muted-2"
                      >
                        <span aria-hidden="true" className="flex-none text-[11px] text-gold">
                          ✦
                        </span>
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
