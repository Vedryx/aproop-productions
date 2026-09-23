"use client";

import { useEffect } from "react";
import { lockBodyScroll } from "@/lib/scroll-lock";

export const INTRO_SEEN_KEY = "ap-intro-seen";

/**
 * The clapperboard cold open. It is the site's loading screen and plays once
 * per browser session — coming back from another page must not replay it.
 *
 * The decision has to be made before first paint, so the flag is read by the
 * inline script in `app/layout.tsx`, which stamps `data-intro-seen` on <html>;
 * CSS hides the overlay from that attribute. This effect only handles the
 * scroll lock and marks the session as seen.
 *
 * Swap sessionStorage for localStorage below to show it once per device
 * instead of once per session.
 */
export default function IntroClap() {
  useEffect(() => {
    const root = document.documentElement;
    // Marking <html> is what actually hides the overlay, so it has to happen on
    // every path out of here — a client-side nav back to this page re-renders
    // the markup without re-running the inline script in layout.tsx.
    const markSeen = () => root.setAttribute("data-intro-seen", "1");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      markSeen();
      return;
    }

    // Decide from the attribute, not from storage: the effect is invoked twice
    // under StrictMode, so reading a flag this effect just wrote would make the
    // second pass believe the intro had already played.
    if (root.hasAttribute("data-intro-seen")) return;

    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {
      // Private mode or blocked storage: the intro just plays again next time.
    }

    const unlock = lockBodyScroll();
    // Deep links (/#producer) must keep their target, so only reset when the
    // visitor is genuinely landing at the top.
    if (!window.location.hash) window.scrollTo({ top: 0 });

    const t = window.setTimeout(() => {
      unlock();
      markSeen();
    }, 2900);

    return () => {
      window.clearTimeout(t);
      unlock();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="ap-intro fixed inset-0 z-[200] flex items-center justify-center bg-[#0d0c0b]"
      style={{ animation: "ap-introout .8s ease 2.05s forwards" }}
    >
      <div
        className="relative w-[min(76vw,540px)]"
        style={{ animation: "ap-shake .16s ease 1.02s 2" }}
      >
        <div
          className="absolute left-0 h-[54px] w-full border-2 border-[#0d0c0b]"
          style={{
            bottom: "calc(100% + 2px)",
            transformOrigin: "0% 100%",
            animation: "ap-clap 1.1s cubic-bezier(.55,-.2,.35,1.5) forwards",
            background:
              "repeating-linear-gradient(100deg,#f4efe4 0 32px,#131211 32px 64px)",
          }}
        />
        <div
          className="h-[54px] border-2 border-[#0d0c0b]"
          style={{
            background:
              "repeating-linear-gradient(80deg,#f4efe4 0 32px,#131211 32px 64px)",
          }}
        />
        <div className="grid grid-cols-[auto_1fr] gap-x-[22px] gap-y-3 border-2 border-t-0 border-cream bg-[#171614] px-[clamp(20px,3vw,32px)] py-[clamp(20px,3vw,30px)] text-[11.5px] uppercase tracking-[0.22em] text-[#8d867e]">
          <span>Prod</span>
          <span className="text-cream">Aproop Production</span>
          <span>Scene</span>
          <span className="text-cream">01 — Every film begins</span>
          <span>Take</span>
          <span className="text-gold">01</span>
        </div>
      </div>
      <div
        className="absolute inset-0 bg-cream opacity-0"
        style={{ animation: "ap-flash .6s ease 1.06s" }}
      />
    </div>
  );
}
