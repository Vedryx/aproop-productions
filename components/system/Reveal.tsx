"use client";

import { useEffect } from "react";

/**
 * Adds the `ap-anim` class to <html> and wires an IntersectionObserver that
 * flips `[data-reveal]` elements to `.in` as they scroll into view.
 * A MutationObserver picks up nodes added later (tab switches, pagination).
 */
export default function Reveal() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("ap-anim");

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );

    let raf = 0;
    const scan = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        document
          .querySelectorAll("[data-reveal]:not(.in)")
          .forEach((el) => io.observe(el));
      });
    };

    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      io.disconnect();
      root.classList.remove("ap-anim");
    };
  }, []);

  return null;
}
