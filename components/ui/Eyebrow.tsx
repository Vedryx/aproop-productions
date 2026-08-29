/**
 * The rolling two-line kicker used above every section heading.
 * Hovering slides the second (gold) line up into place.
 */
export default function Eyebrow({
  top,
  bottom,
  className = "",
  tone = "dark",
}: {
  top: string;
  bottom: string;
  className?: string;
  tone?: "dark" | "gold";
}) {
  return (
    <div
      className={`h-[1.35em] overflow-hidden text-[12px] uppercase tracking-[0.26em] ${
        tone === "gold"
          ? "font-semibold text-rust-deep"
          : "font-medium text-rust"
      } ${className}`}
    >
      <div className="group flex w-max cursor-default flex-col transition-transform duration-500 [transition-timing-function:cubic-bezier(.2,.7,.2,1)] hover:-translate-y-[1.35em]">
        <span className="block h-[1.35em] whitespace-nowrap leading-[1.35em]">
          {top}
        </span>
        <span
          className={`block h-[1.35em] whitespace-nowrap leading-[1.35em] ${
            tone === "gold" ? "text-ink" : "text-gold"
          }`}
        >
          {bottom}
        </span>
      </div>
    </div>
  );
}
