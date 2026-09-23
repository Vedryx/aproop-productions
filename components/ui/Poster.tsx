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
/**
 * `hqdefault` is 4:3 and carries the 16:9 frame letterboxed inside it, so the
 * real still is the middle 75%. Scaling by 4/3 lifts those baked-in bars out of
 * the card, which clips its overflow, leaving the frame itself contained.
 */
const LETTERBOXED = 1.5;
const UNBOX = "scale-[1.3333]";

export default function Poster(props: { vid: string; alt: string }) {
  return <PosterImage key={props.vid} {...props} />;
}

function PosterImage({ vid, alt }: { vid: string; alt: string }) {
  const [step, setStep] = useState(0);
  const [boxed, setBoxed] = useState(false);

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
        const img = e.currentTarget;
        if (img.naturalWidth < MIN_WIDTH) {
          next();
          return;
        }
        setBoxed(img.naturalWidth / img.naturalHeight < LETTERBOXED);
      }}
      className={`absolute inset-0 block h-full w-full bg-ink-darker object-contain ${
        boxed ? UNBOX : ""
      }`}
    />
  );
}
