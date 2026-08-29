"use client";

import { useState } from "react";

/**
 * YouTube stills. `maxresdefault` is only generated for videos uploaded in HD,
 * and when it is missing YouTube serves a 120x90 grey placeholder with a 200
 * status rather than a 404 — so we check the decoded width as well as onError
 * before stepping down the ladder.
 */
const LADDER = ["maxresdefault", "hq720", "hqdefault"];
const MIN_WIDTH = 200;

export default function Poster({ vid, alt }: { vid: string; alt: string }) {
  const [step, setStep] = useState(0);

  if (step >= LADDER.length) {
    return <div role="img" aria-label={alt} className="absolute inset-0 bg-ink-darker" />;
  }

  const next = () => setStep((s) => s + 1);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={LADDER[step]}
      src={`https://img.youtube.com/vi/${vid}/${LADDER[step]}.jpg`}
      alt={alt}
      loading="lazy"
      onError={next}
      onLoad={(e) => {
        if (e.currentTarget.naturalWidth < MIN_WIDTH) next();
      }}
      className="absolute inset-0 block h-full w-full bg-ink-darker object-cover"
    />
  );
}
