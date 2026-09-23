"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * Plain <img> that removes itself if the file is missing, so a not-yet-supplied
 * asset degrades to empty space instead of a broken-image glyph.
 *
 * The onError handler alone is not enough: server-rendered images can fail
 * before React hydrates and attaches it, so on mount we also inspect an
 * already-settled image for a zero intrinsic width.
 */
type Props = {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  width?: number;
  height?: number;
};

export default function SafeImg(props: Props) {
  return <ImageWithFallback key={props.src} {...props} />;
}

function ImageWithFallback({
  src,
  alt,
  className,
  style,
  width,
  height,
}: Props) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el?.complete && el.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
