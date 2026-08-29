"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { menuItems } from "@/lib/data";

const NAV_LINK =
  "relative text-[12px] uppercase tracking-[0.22em] text-[#141414] font-medium py-1.5 transition-[color,letter-spacing] duration-300";

export default function Header() {
  const [nav, setNav] = useState<"up" | "down">("down");
  const [atTop, setAtTop] = useState<"yes" | "no">("yes");
  const [menu, setMenu] = useState(false);
  const acc = useRef(0);
  const last = useRef(0);

  useEffect(() => {
    last.current = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      const heroEl = document.getElementById("top");
      const heroH = heroEl ? heroEl.offsetHeight : 0;
      setAtTop(y < Math.max(heroH - 96, 0) ? "yes" : "no");

      const d = y - last.current;
      if (d * acc.current < 0) acc.current = 0;
      acc.current += d;

      if (y < 120) {
        acc.current = 0;
        setNav("down");
      } else if (acc.current > 90) {
        acc.current = 0;
        setNav("up");
      } else if (acc.current < -70) {
        acc.current = 0;
        setNav("down");
      }
      last.current = y;
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-nav={nav}
      data-top={atTop}
      className="fixed inset-x-0 top-0 z-50 border-b border-[rgba(20,20,20,.1)] bg-white shadow-[0_1px_24px_rgba(0,0,0,.18)] backdrop-blur-[10px] will-change-transform"
    >
      <div className="ap-hbar mx-auto flex h-[78px] max-w-[1320px] items-center gap-[clamp(16px,3vw,48px)] px-[clamp(20px,4vw,56px)]">
        <nav className="ap-hnav ml-auto flex items-center gap-[clamp(18px,2.6vw,40px)]">
          {menuItems.map((m) => (
            <a key={m.href} href={m.href} className={NAV_LINK}>
              {m.label}
            </a>
          ))}
        </nav>

        <a
          href="#contact"
          data-cta="1"
          className="relative flex flex-none items-center gap-2.5 overflow-hidden border border-[#141414] bg-[#141414] px-[22px] py-3.5 text-[11px] font-medium uppercase tracking-[0.24em] text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-amber hover:bg-amber hover:text-[#141414]"
        >
          Start a project{" "}
          <span
            className="inline-block text-[13px]"
            style={{ animation: "ap-nudge 2.2s ease-in-out infinite" }}
          >
            ↗
          </span>
        </a>

        <button
          type="button"
          className="ap-burger h-[46px] w-[46px] flex-none cursor-pointer flex-col items-center justify-center gap-[5px] border border-[rgba(20,20,20,.22)] bg-transparent p-0 transition-colors duration-300"
          data-open={menu ? "yes" : "no"}
          aria-label="Menu"
          aria-expanded={menu}
          onClick={() => setMenu((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <div
          className="ap-plate pointer-events-none absolute left-0 top-0 z-[2] flex h-[128px] w-auto items-start rounded-br-[clamp(96px,11vw,150px)] bg-white/60 pb-[clamp(22px,2.4vw,34px)] pl-[clamp(16px,2vw,30px)] pr-[clamp(46px,5vw,74px)] pt-[clamp(8px,0.9vw,14px)] backdrop-blur-[16px] backdrop-saturate-[120%] transition-[opacity,transform] duration-500"
          style={{ boxSizing: "border-box" }}
        >
          <Image
            className="ap-plogo block h-[clamp(54px,7vw,88px)] w-auto flex-none"
            src="/uploads/aproop-logo-hero.png"
            alt="Aproop Productions"
            width={420}
            height={340}
            priority
            style={{ height: "clamp(54px,7vw,88px)", width: "auto" }}
          />
        </div>
      </div>

      <div
        className="ap-drawer grid border-t border-[rgba(20,20,20,.08)] bg-white transition-[grid-template-rows,opacity] duration-500"
        data-open={menu ? "yes" : "no"}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col px-[clamp(18px,5vw,32px)] pb-[22px] pt-1.5 transition-transform duration-500">
            {menuItems.map((m) => (
              <a
                key={m.href}
                href={m.href}
                onClick={() => setMenu(false)}
                className="flex items-baseline gap-3.5 border-b border-[rgba(20,20,20,.08)] py-[15px] font-display text-2xl text-[#141414] transition-[color,padding-left] duration-300 hover:pl-2 hover:text-[#a8781c]"
              >
                <span className="font-body text-[11px] tracking-[0.2em] text-rust tabular-nums">
                  {m.num}
                </span>
                {m.label}
              </a>
            ))}
            <a
              href="#contact"
              data-drawer-cta="1"
              onClick={() => setMenu(false)}
              className="mt-5 flex min-h-[44px] items-center justify-center gap-2.5 bg-[#141414] px-[22px] py-[17px] text-[11.5px] font-medium uppercase tracking-[0.24em] text-white hover:bg-amber hover:text-[#141414]"
            >
              Start a project <span className="text-[13px]">↗</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
