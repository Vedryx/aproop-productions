"use client";

import { useEffect, useRef, useState } from "react";

export default function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    const p = v.play();
    if (p && p.catch) p.catch(() => {});

    // Re-mute once the hero scrolls mostly out of view.
    const onScroll = () => {
      const heroEl = document.getElementById("top");
      const heroH = heroEl ? heroEl.offsetHeight : 0;
      if (!v.muted && window.scrollY > Math.max(heroH * 0.75, 200)) {
        v.muted = true;
        setMuted(true);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = !muted;
    v.muted = next;
    if (!next) {
      v.volume = 1;
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    }
    setMuted(next);
  };

  return (
    <section
      id="top"
      data-screen-label="Hero"
      className="relative h-screen min-h-[560px] w-full overflow-hidden bg-ink-deep"
    >
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
        <video
          ref={videoRef}
          src="/uploads/biryani_web_compressed.mp4"
          poster="/uploads/hero-poster.jpg"
          autoPlay
          loop
          playsInline
          preload="auto"
          className="pointer-events-none absolute inset-0 block h-full w-full object-cover"
        />
      </div>

      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Unmute the video" : "Mute the video"}
        className="absolute bottom-[clamp(74px,7.4vw,104px)] right-[clamp(20px,4vw,56px)] z-[2] flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[rgba(244,239,228,.34)] bg-[rgba(11,10,9,.34)] p-0 text-cream backdrop-blur-[6px] transition-all duration-300 hover:scale-[1.08] hover:border-amber hover:bg-[rgba(11,10,9,.6)] hover:text-amber"
      >
        {muted ? (
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M11 5 6 9H3v6h3l5 4z" />
            <line x1="17" y1="9" x2="22" y2="15" />
            <line x1="22" y1="9" x2="17" y2="15" />
          </svg>
        ) : (
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M11 5 6 9H3v6h3l5 4z" />
            <path d="M15.5 8.5a4.5 4.5 0 0 1 0 7" />
            <path d="M18.5 5.8a8 8 0 0 1 0 12.4" />
          </svg>
        )}
      </button>

      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(11,10,9,.55) 0%, rgba(11,10,9,.12) 30%, rgba(11,10,9,.3) 66%, rgba(19,18,17,.96) 100%)",
        }}
      />

      <a
        href="#work"
        className="absolute bottom-[clamp(20px,3.4vw,38px)] right-[clamp(14px,4vw,50px)] flex min-h-11 items-center gap-3.5 px-1.5 py-3 text-[11px] font-medium uppercase tracking-[0.26em] text-cream no-underline transition-colors duration-300 hover:text-amber"
        style={{ textShadow: "0 2px 18px rgba(0,0,0,.6)" }}
      >
        Scroll down{" "}
        <span
          className="inline-block text-sm"
          style={{ animation: "ap-nudge 2.2s ease-in-out infinite" }}
        >
          ↓
        </span>
      </a>
    </section>
  );
}
