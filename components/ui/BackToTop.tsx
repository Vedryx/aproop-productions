"use client";

/**
 * The href is kept so the control still works without JS, but the scroll is
 * driven here: on /be-the-producer the `#top` target is the sticky header, and
 * once it is stuck its offsetTop equals the current scroll position, so the
 * native anchor jump resolves to where you already are and nothing moves.
 */
export default function BackToTop({ className }: { className?: string }) {
  return (
    <a
      href="#top"
      className={className}
      onClick={(e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
        // Don't leave #top in the URL — a later reload would re-trigger it.
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      }}
    >
      Back to top{" "}
      <span
        className="inline-block"
        style={{ animation: "ap-nudge 2.4s ease-in-out infinite" }}
        aria-hidden="true"
      >
        ↑
      </span>
    </a>
  );
}
