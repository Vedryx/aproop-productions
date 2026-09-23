"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { logoFiles, logoHeights, testimonials } from "@/lib/data";

function LogoRow({ hidden = false }: { hidden?: boolean }) {
  return (
    <div
      aria-hidden={hidden || undefined}
      className="flex items-center gap-[clamp(34px,3.6vw,58px)] pr-[clamp(34px,3.6vw,58px)]"
    >
      {logoFiles.map((n, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={n}
          src={`/logos/${n}.png`}
          alt={hidden ? "" : "Client logo"}
          className="block w-auto max-w-[280px] flex-none object-contain"
          style={{ height: `${logoHeights[i]}px` }}
        />
      ))}
    </div>
  );
}

export default function Brands() {
  const [q, setQ] = useState(0);
  const [dir, setDir] = useState<"r" | "l">("r");
  const timer = useRef<number | null>(null);

  const startAuto = useCallback(() => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      setDir("r");
      setQ((v) => (v + 1) % testimonials.length);
    }, 3000);
  }, []);

  const go = useCallback(
    (i: number, d: "r" | "l", manual?: boolean) => {
      if (manual) startAuto();
      setDir(d);
      setQ((i + testimonials.length) % testimonials.length);
    },
    [startAuto],
  );

  useEffect(() => {
    startAuto();
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [startAuto]);

  const anim = `${dir}${q % 2 ? "a" : "b"}`;

  const arrow =
    "absolute top-1/2 z-[2] flex h-[46px] w-[46px] -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-[rgba(217,178,60,.5)] bg-transparent font-body text-[17px] leading-none text-gold transition-colors duration-300 hover:border-gold hover:bg-gold hover:text-ink";

  return (
    <section id="brands" data-screen-label="Brands" className="bg-ink-deep">
      <div className="bg-gold py-[9px]">
        <div className="overflow-hidden border-y border-[rgba(19,18,17,.12)] bg-[#faf7f0] py-[18px]">
          <div
            className="flex w-max"
            style={{ animation: "ap-marquee 58s linear infinite" }}
          >
            <LogoRow />
            <LogoRow hidden />
          </div>
        </div>
      </div>

      <div
        tabIndex={0}
        role="group"
        aria-label="Testimonials — use left and right arrow keys"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            go(q + 1, "r", true);
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            go(q - 1, "l", true);
          }
        }}
        className="relative mx-auto max-w-[1060px] px-[clamp(60px,8vw,116px)] py-[clamp(56px,6vw,96px)] text-center outline-none"
      >
        <button
          type="button"
          onClick={() => go(q - 1, "l", true)}
          aria-label="Previous testimonial"
          className={`${arrow} left-[clamp(2px,1vw,16px)]`}
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => go(q + 1, "r", true)}
          aria-label="Next testimonial"
          className={`${arrow} right-[clamp(2px,1vw,16px)]`}
        >
          →
        </button>

        <div className="font-display text-[80px] leading-[.5] text-gold">“</div>

        {/* Every quote sits in the same grid cell, so the box is always as tall
            as the longest one and the page never shifts as they rotate. */}
        <div className="grid overflow-hidden">
          {testimonials.map((t, i) => (
            <div
              key={i}
              data-anim={i === q ? anim : undefined}
              aria-hidden={i === q ? undefined : true}
              className={`col-start-1 row-start-1 flex flex-col gap-3.5 pb-1 pt-[26px] ${
                i === q ? "" : "invisible"
              }`}
            >
              <p className="m-0 font-display text-[clamp(21px,2.1vw,33px)] font-normal italic leading-[1.45] text-cream-2 [text-wrap:pretty]">
                {t.text}
              </p>
              <div className="mt-[18px] font-display text-[clamp(20px,1.7vw,25px)] text-cream-2">
                {t.who}
              </div>
              <div className="-mt-1 text-[11px] uppercase leading-[1.7] tracking-[0.22em] text-gold">
                {t.org}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-[22px] flex justify-center gap-1">
          {testimonials.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i, i > q ? "r" : "l")}
              aria-label={`Show quote ${i + 1}`}
              className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0"
            >
              <span
                aria-hidden="true"
                className="block h-[9px] w-[9px] rounded-full border border-gold transition-colors duration-300"
                style={{ background: q === i ? "#d9b23c" : "transparent" }}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
