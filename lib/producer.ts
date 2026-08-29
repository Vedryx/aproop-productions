export type Project = {
  title: string;
  kind: string;
  ph: string;
  poster: string;
  synopsis: string;
  director: string;
  stage: string;
  closes: string;
  need: number;
  raised: number;
  backers: number;
  options: number[];
};

/** Indian digit grouping: 8,00,000 rather than 800,000. */
export function fmtINR(n: number): string {
  const s = String(n);
  const last = s.slice(-3);
  const rest = s.slice(0, -3);
  return "₹" + (rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," : "") + last;
}

export const projects: Project[] = [
  {
    title: "दाटण / Datan",
    kind: "Short film",
    ph: "Datan — poster",
    poster: "/uploads/datan-poster.jpg",
    synopsis:
      "Datan (Congestion) — a short film written and directed by Harish Tarun and the Aproop team. A story about the pressure of a life that keeps closing in, told in one tightening circle.",
    director: "Harish Tarun & team",
    stage: "Pre-production",
    closes: "December 2026",
    need: 800000,
    raised: 320000,
    backers: 42,
    options: [5000, 10000, 50000],
  },
  {
    title: "भीमभास्कर / Bhimbhaskara",
    kind: "Song",
    ph: "Bhimbhaskara — key art",
    poster: "/uploads/bhimbhaskara-keyart.jpg",
    synopsis:
      "Bhimbhaskara — an original song based on the life and work of Dr. Bhimrao Ambedkar, written, composed and produced in-house, to be shot as a full music film.",
    director: "Aproop team",
    stage: "Composition done · shoot pending",
    closes: "October 2026",
    need: 1200000,
    raised: 960000,
    backers: 117,
    options: [5000, 10000, 50000],
  },
];
