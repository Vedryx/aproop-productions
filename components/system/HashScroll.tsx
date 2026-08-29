"use client";

import { useEffect } from "react";

/**
 * Lands a /#section deep link on the right section.
 *
 * The browser's own hash jump fires before the fixed header is measured and
 * before reveal animations settle the layout, so the target drifts. This
 * re-runs the scroll a few times over the first second, offset by the header
 * height, which is what "Back to the studio" needs to return to 05.
 */
export default function HashScroll() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;

    const jump = () => {
      const el = document.getElementById(id);
      if (!el) return;
      const header = document.querySelector("header");
      const offset = header instanceof HTMLElement ? header.offsetHeight : 78;
      const y = window.scrollY + el.getBoundingClientRect().top - offset;
      window.scrollTo({ top: Math.max(0, y), behavior: "auto" });
    };

    // If the cold open is running, wait it out before taking over the scroll.
    const introPlaying = !document.documentElement.hasAttribute("data-intro-seen");
    const delays = introPlaying ? [3000, 3200] : [0, 120, 400, 900];
    const timers = delays.map((d) => window.setTimeout(jump, d));

    return () => timers.forEach(window.clearTimeout);
  }, []);

  return null;
}
