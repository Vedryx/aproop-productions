# Aproop Production — website

Next.js (App Router) + Tailwind CSS v4 implementation of the `Aproop Dark.dc.html`
Claude Design canvas.

```bash
npm run dev     # http://localhost:3000
npm run build
npm run lint
```

## Structure

| Path | What it is |
| --- | --- |
| `app/page.tsx` | The one-page site — sections composed in design order |
| `app/be-the-producer/page.tsx` | `Be the Producer.dc.html` — open projects + funding panels |
| `app/globals.css` | Design tokens (`@theme`), keyframes, header/drawer and reveal CSS |
| `lib/data.ts` | Film shelves, testimonials, FAQ, service phases, nav |
| `components/` | One file per section, plus `Reveal`, `VideoModal`, `Poster`, `SafeImg` |

Film stills are pulled straight from YouTube (`img.youtube.com`) and step down
through `maxresdefault → hq720 → hqdefault` when a rendition is missing, so the
work grid needs no local poster files.

## Heavy assets

Five files exceed the design MCP's 256 KiB per-file read cap, so `get_file`
returns them truncated and they can't be imported with the rest of the project.
They also arrive as masters far too big to ship (the hero is a 159 MB /
18.7 Mbps 1080p file; the posters are 6000x3375 PNGs), so they are encoded
rather than copied:

```bash
npm run assets                    # searches ~/Downloads and ~/Desktop
npm run assets -- ~/some/folder   # or point it at a folder / .zip
```

| output | from | encode |
| --- | --- | --- |
| `biryani_web_compressed.mp4` | `BIRYANI FINAL.mp4` | h264 crf 30, 1080p, faststart — 159 MB → 11 MB |
| `hero-poster.jpg` | same | frame at 2s, used as the `<video poster>` |
| `makers-bg.png` | `duo_photo.png` | 1778px wide, alpha kept — 4.9 MB → 576 KB |
| `datan-poster.jpg` | `Datan Short Film.png` | 1600px wide jpg — 17 MB → 228 KB |
| `bhimbhaskara-keyart.jpg` | `Bhimbhaskara Song.png` | 1600px wide jpg — 39 MB → 320 KB |
| `founders-cutout.png` | `founders-cutout.png` | 920px wide, alpha kept — **still missing** |

`founders-cutout.png` is the cutout in the About section; that slot renders
empty until it is supplied (`SafeImg` drops a missing image rather than showing
a broken glyph). Drop it anywhere the script searches and re-run.

Everything else (20 client logos, both logo marks) imported fine and lives in
`public/logos/` and `public/uploads/`.

## Notes

- The clapperboard cold open is the site's loading screen and plays **once per
  browser session**. The decision is made before first paint by an inline script
  in `app/layout.tsx` that stamps `data-intro-seen` on `<html>`; CSS hides the
  overlay from that attribute, so returning to the home page never replays it
  and never flashes. Swap `sessionStorage` for `localStorage` in
  `components/IntroClap.tsx` to make it once per device.
- `HashScroll` lands `/#section` deep links under the fixed header, re-running
  the scroll over the first second so reveal animations can't drift the target.
  That is what makes "Back to the studio" return to section 05.
- The contact form is presentational, matching the design: submitting swaps the
  button label and does not post anywhere yet. Wire it to an endpoint when the
  destination is decided.
- On `/be-the-producer`, the tier buttons drive the CTA, which is a `mailto:`
  with the film and amount pre-filled in the subject and body — exactly as the
  canvas specifies. No payment gateway is wired up.
- The canvas defines a "Pitch your story" modal but ships no control that opens
  it. It is implemented as designed and reached from a "Have a story of your
  own? Pitch it to us" line under the projects — the one addition to the canvas.
- The canvas has no breakpoints; the funding panel stacks under the film below
  900px (see `.bp-card` in `globals.css`).
