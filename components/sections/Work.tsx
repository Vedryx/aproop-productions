"use client";

import { useMemo, useState } from "react";
import { type Film, type Shelf } from "@/lib/data";
import Eyebrow from "@/components/ui/Eyebrow";
import Poster from "@/components/ui/Poster";
import VideoModal, { type PlayTarget } from "@/components/ui/VideoModal";

const PER_PAGE = 4;

type Card = {
  key: string;
  vid: string;
  num: string;
  label: string;
  title: string;
  award: boolean;
};

/** "All" interleaves the categories row by row so the grid stays varied. */
function buildAll(shelfData: Shelf[]): Card[] {
  const lists = shelfData.filter((s) => s.films.length);
  const depth = Math.max(...lists.map((s) => s.films.length));
  const rows: Card[] = [];
  for (let r = 0; r < depth; r++) {
    lists.forEach((s) => {
      const f = s.films[r];
      if (f) rows.push(toCard(s, f, r));
    });
  }
  return rows;
}

function toCard(s: Shelf, f: Film, i: number): Card {
  return {
    key: `${s.slot}-f${i + 1}`,
    vid: f.vid,
    num: `${s.num}.${i + 1}`,
    label: s.key,
    title: f.title,
    award: !!f.award,
  };
}

export default function Work({ shelfData }: { shelfData: Shelf[] }) {
  const [cat, setCat] = useState("All");
  const [page, setPage] = useState(0);
  const [play, setPlay] = useState<PlayTarget>(null);

  const cards = useMemo(() => {
    if (cat === "All") return buildAll(shelfData);
    const active = shelfData.find((s) => s.key === cat);
    return active ? active.films.map((f, i) => toCard(active, f, i)) : [];
  }, [cat, shelfData]);

  const pageCount = Math.ceil(cards.length / PER_PAGE);
  const current = Math.min(page, Math.max(0, pageCount - 1));
  const visible =
    pageCount > 1
      ? cards.slice(current * PER_PAGE, (current + 1) * PER_PAGE)
      : cards;

  const goPage = (n: number) => {
    setPage(n);
    const grid = document.querySelector(".ap-wgrid");
    if (!grid) return;
    const top = window.scrollY + grid.getBoundingClientRect().top - 130;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  };

  const chipBase =
    "min-h-11 cursor-pointer font-body text-[11.5px] uppercase tracking-[0.2em] px-[18px] py-3 inline-flex items-center justify-center whitespace-nowrap transition-[color,border-color,background] duration-300";

  const cats = ["All", ...shelfData.map((s) => s.key)];

  return (
    <section
      id="work"
      data-screen-label="Work"
      className="mx-auto max-w-[1320px] px-[clamp(20px,4vw,56px)] py-[clamp(40px,4.6vh,84px)]"
    >
      <div className="ap-2col mb-[clamp(20px,2.8vh,40px)] grid grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)] items-end gap-[clamp(24px,4vw,60px)]">
        <div>
          <Eyebrow
            top="01 / Final outputs"
            bottom="01 / Our work"
            className="mb-[clamp(12px,1.9vh,26px)]"
          />
          <h2
            data-reveal=""
            className="m-0 font-display text-[clamp(34px,min(5.6vw,6.4vh),70px)] font-normal leading-none text-cream-2"
          >
            The work
            <br />
            <em className="italic text-gold">so far.</em>
          </h2>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Work categories"
        className="ap-cats mb-[clamp(16px,2.2vh,32px)] grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5 border-y border-[rgba(217,178,60,.22)] py-[clamp(10px,1.4vh,16px)]"
      >
        {cats.map((label, i) => {
          const active = cat === label;
          return (
            <button
              key={label}
              type="button"
              role="tab"
              id={`work-tab-${i}`}
              aria-selected={active}
              aria-controls="work-grid"
              onClick={() => {
                setCat(label);
                setPage(0);
              }}
              className={`${chipBase} ${
                active
                  ? "border border-gold bg-gold font-semibold text-ink"
                  : "border border-[rgba(244,239,228,.16)] text-muted hover:border-gold hover:text-cream-2"
              }`}
            >
              <span className="mr-[9px] tabular-nums opacity-55">
                {label === "All" ? "✲" : shelfData[i - 1].num}
              </span>
              {label}
            </button>
          );
        })}
      </div>

      <div
        id="work-grid"
        role="tabpanel"
        aria-labelledby={`work-tab-${cats.indexOf(cat)}`}
        className="ap-wgrid grid auto-rows-fr grid-cols-2 items-start justify-items-stretch gap-[clamp(14px,1.7vh,24px)]"
      >
        {visible.map((c) => (
          <article
            key={c.key}
            data-reveal=""
            className="relative flex h-[clamp(300px,30vw,366px)] flex-col border border-[rgba(244,239,228,.09)] bg-panel transition-all duration-500 hover:-translate-y-2 hover:border-[rgba(217,178,60,.55)] hover:shadow-[0_30px_60px_rgba(0,0,0,.5)]"
          >
            <div className="relative h-[68%] flex-none overflow-hidden border-b border-[rgba(244,239,228,.09)] bg-ink-darker">
              <Poster vid={c.vid} alt={c.label} />

              <button
                type="button"
                onClick={() =>
                  setPlay({ id: c.vid, title: c.title, single: true })
                }
                aria-label={`Play ${c.title}`}
                className="group absolute inset-0 flex h-full w-full cursor-pointer items-center justify-center border-none bg-[rgba(15,14,13,.34)] p-0 transition-colors duration-300 hover:bg-[rgba(15,14,13,.12)]"
              >
                <span className="flex h-[62px] w-[62px] items-center justify-center rounded-full border border-[rgba(217,178,60,.8)] bg-[rgba(19,18,17,.72)] pl-1 text-lg text-gold shadow-[0_10px_30px_rgba(0,0,0,.45)] transition-all duration-300 group-hover:scale-110 group-hover:bg-gold group-hover:text-ink">
                  ▶
                </span>
              </button>

              <span className="absolute left-0 top-4 border-l-2 border-gold bg-[rgba(19,18,17,.86)] px-3 py-[7px] text-[11px] uppercase tracking-[0.22em] text-gold-soft tabular-nums">
                {c.num} · {c.label}
              </span>

              {c.award && (
                <span className="absolute bottom-4 left-0 bg-gold px-3 py-[7px] text-[11px] font-semibold uppercase tracking-[0.2em] text-ink">
                  ★ Award winning
                </span>
              )}
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-between gap-5 overflow-hidden px-[clamp(20px,2vw,26px)] py-[clamp(18px,1.8vw,24px)]">
              <h3 className="m-0 line-clamp-2 font-display text-[clamp(23px,1.9vw,29px)] font-medium leading-[1.34] text-cream-2">
                {c.title}
              </h3>
              <div className="flex flex-none items-center">
                <button
                  type="button"
                  onClick={() =>
                    setPlay({ id: c.vid, title: c.title, single: true })
                  }
                  aria-label={`Play ${c.title}`}
                  className="h-[46px] w-[46px] flex-none cursor-pointer rounded-full border border-[rgba(217,178,60,.6)] bg-transparent text-sm text-gold transition-all duration-300 hover:rotate-[10deg] hover:scale-110 hover:bg-gold hover:text-ink"
                >
                  ↗
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {pageCount > 1 && (
        <nav
          aria-label="Work pages"
          className="mt-[clamp(16px,2.1vh,30px)] flex flex-wrap items-center justify-center gap-[clamp(6px,1.4vw,22px)] tabular-nums"
        >
          <button
            type="button"
            onClick={() => current > 0 && goPage(current - 1)}
            aria-label="Previous page"
            disabled={current === 0}
            className={`flex h-11 w-11 flex-none items-center justify-center border-none text-base leading-none transition-colors duration-300 ${
              current > 0
                ? "cursor-pointer text-gold"
                : "cursor-default text-[#4d4842]"
            }`}
          >
            ←
          </button>
          {Array.from({ length: pageCount }, (_, n) => {
            const on = n === current;
            return (
              <button
                key={n}
                type="button"
                onClick={() => goPage(n)}
                aria-label={`Page ${n + 1} of ${pageCount}`}
                aria-current={on ? "page" : undefined}
                className={`min-h-11 min-w-11 cursor-pointer px-[13px] py-[9px] text-[12px] tracking-[0.2em] tabular-nums transition-[color,border-color,background] duration-300 ${
                  on
                    ? "border border-gold bg-gold font-semibold text-ink"
                    : "border border-[rgba(244,239,228,.16)] text-muted hover:border-gold hover:text-cream-2"
                }`}
              >
                {String(n + 1).padStart(2, "0")}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => current < pageCount - 1 && goPage(current + 1)}
            aria-label="Next page"
            disabled={current >= pageCount - 1}
            className={`flex h-11 w-11 flex-none items-center justify-center border-none text-base leading-none transition-colors duration-300 ${
              current < pageCount - 1
                ? "cursor-pointer text-gold"
                : "cursor-default text-[#4d4842]"
            }`}
          >
            →
          </button>
        </nav>
      )}

      <VideoModal play={play} onClose={() => setPlay(null)} />
    </section>
  );
}
