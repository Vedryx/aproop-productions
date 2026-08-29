"use client";

import { useEffect } from "react";

export type PlayTarget = { id: string; title: string; single?: boolean } | null;

export default function VideoModal({
  play,
  onClose,
}: {
  play: PlayTarget;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!play) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [play, onClose]);

  if (!play) return null;

  const src = play.single
    ? `https://www.youtube.com/embed/${play.id}?autoplay=1&rel=0`
    : `https://www.youtube.com/embed/videoseries?list=${play.id}&autoplay=1&rel=0`;
  const title = play.single ? play.title : `${play.title} — showreel`;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(11,10,9,.5)] p-[clamp(16px,5vw,64px)] backdrop-blur-[3px]"
      style={{ animation: "ap-fadein .35s ease both" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative aspect-video w-[min(1080px,100%)] border border-[rgba(217,178,60,.45)] bg-black shadow-[0_50px_140px_rgba(0,0,0,.75)]"
        style={{ animation: "ap-modalin .55s cubic-bezier(.2,.7,.2,1) both" }}
      >
        <iframe
          src={src}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 block h-full w-full border-0"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close video"
          className="absolute bottom-full right-0 mb-3.5 flex cursor-pointer items-center gap-2.5 rounded-full border border-[rgba(244,239,228,.34)] bg-transparent px-[18px] py-2.5 text-[11px] uppercase tracking-[0.24em] text-cream transition-colors duration-300 hover:border-amber hover:text-amber"
        >
          Close ✕
        </button>
      </div>
    </div>
  );
}
