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
| `app/globals.css` | Design tokens (`@theme`), keyframes, and the responsive layer |
| `app/robots.ts`, `app/sitemap.ts` | Generated at build time |
| `components/layout/` | `Header`, `Footer`, `ProducerHeader` |
| `components/sections/` | One file per page section |
| `components/ui/` | Reusable pieces — `Eyebrow`, `SafeImg`, `Poster`, modals, `ProjectCard` |
| `components/system/` | Behaviour with no markup — `Reveal`, `HashScroll`, `IntroClap` |
| `hooks/` | `useFocusTrap` |
| `lib/` | Content: film shelves, testimonials, FAQ, service phases, projects |

### Breakpoints

Four tiers, applied consistently in `app/globals.css`:

| width | what changes |
| --- | --- |
| `1024` | header collapses to the drawer; every multi-column section stacks |
| `768` | two-column heading blocks stack |
| `640` | work grid goes single column |
| `480` | logo plate shrinks; category chips go two-up |

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
| `founders-cutout.png` | `about_us.png` | 920px wide, palette PNG with alpha — 5.5 MB → 139 KB |

All five are now supplied, so the site has no missing assets.

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
- Contact and pitch forms send through `/api/contact` using Resend. Shared MongoDB
  quotas, bounded requests and idempotent delivery protect the endpoint; see
  [contact reliability](docs/CONTACT-RELIABILITY.md) for configuration and retry limits.
- On `/be-the-producer`, the tier buttons drive the CTA, which is a `mailto:`
  with the film and amount pre-filled in the subject and body — exactly as the
  canvas specifies. No payment gateway is wired up.
- The canvas defines a "Pitch your story" modal but ships no control that opens
  it. It is implemented as designed and reached from a "Have a story of your
  own? Pitch it to us" line under the projects — the one addition to the canvas.
- The canvas has no breakpoints; the funding panel stacks under the film below
  900px (see `.bp-card` in `globals.css`).

## Studio admin

Visit `/admin` to manage **Final outputs**, **Be the producer**, and its **two homepage story stars**. The existing public layout is preserved. Film and story changes are stored in MongoDB. Public content uses a shared data cache that is invalidated immediately after admin saves; no rebuild is needed. See [caching and authentication](docs/CACHING-AND-AUTH.md). Visitors already viewing a page see changes when they reload.

### Local setup

```sh
npm install
npm run setup:admin
npm run db:up
npm run db:setup
npm run dev
```

Docker Desktop must be running. `compose.yaml` starts only MongoDB, binds it to loopback port **27019**, and uses a named volume. `npm run db:stop` stops the container without removing data. Do not use `docker compose down -v` unless you intend to erase it.

The setup script adds missing settings to the ignored `.env.local` file, preserving existing values. It generates a random password and JWT secret, with `admin@aproop.local` as the temporary email. Replace `ADMIN_EMAIL` and `ADMIN_PASSWORD` with the supplied credentials, then restart Next.js. Passwords must be at least 12 characters; the JWT secret at least 32. There is no public registration or default production login. Do not send credentials through Git.

`APP_ORIGIN` must exactly match the browser origin (scheme, hostname and port), with no trailing slash. For example, if port 3000 is occupied, run `npm run dev -- --port 3001` and set `APP_ORIGIN=http://localhost:3001` before starting the server. Use that exact URL in the browser.

### Editing

- **Final outputs:** add/edit/remove films, paste YouTube links or IDs, set client credits and award badges, change categories, reorder films within a category, and publish/unpublish. Add or rename categories; remove empty ones.
- **Be the producer:** a dedicated four-step editor (Story details → Poster → Funding → Review & publish) replaces the long side panel. Values stay in place when moving between steps, Next checks the current fields, and Save takes you to any missing or invalid field. Manage title, type, poster, alt text, synopsis, director, stage, closing label, funding goal, manually recorded progress and contribution presets. Upload still JPG/PNG/WebP posters up to 4 MB and 25 megapixels or use HTTPS image URLs. Uploads are decoded for validation, persisted in MongoDB GridFS and streamed from `/media/:id`. See [media delivery](docs/MEDIA-DELIVERY.md).
- **Homepage stars:** click the star beside a saved, published story or in its review screen. Stars update the homepage immediately, with a maximum of two enforced by the server. Unstar a story to make room for another. This action preserves other unsaved edits. Unpublishing/removing a story clears its star when saved.
- **Less typing:** select formats, production stages and existing directors, or add a custom option. Choose a closing date/month and contribution presets. Posters use an upload-first layout with optional URL and image-description controls. Search and filter published, draft or starred stories.
- **Save changes** persists edits in the active section and publishes items marked Published. Unfinished edits in the other section remain in the editor and cannot block this save. A film marked for publication shows “Ready to publish · Unsaved” until saving succeeds; “Published” confirms saved publication. Film-specific save buttons and notices distinguish drafts from published films. The homepage shows four films per page, with category filters and pagination. Drafts can be saved with a title before all details are complete; publishing requires the complete fields. New films/stories start as drafts. Draft content never reaches public page props.
- Existing source content is imported only when the content document is absent. Deleting all films/stories does not re-import them. Source arrays remain solely as initial seed material.
- Simultaneous editors use revision checks: an outdated save is rejected instead of silently overwriting newer content. After a conflict, keep any intended edits elsewhere and reload the editor.

### Authentication and storage

Single owner account configured through server environment variables. Sessions use HS256 JWTs in HttpOnly, SameSite=Strict cookies (Secure under production), with an eight-hour expiry and server-side session records. Every admin API checks authentication. Signing out revokes the stored session, and changing credentials invalidates older tokens. Mutation routes require the configured same origin. Login attempts are limited in MongoDB to ten per fifteen-minute account-wide window, with a five-attempt cap for each trusted client; these limits apply across app instances. Password comparisons run asynchronously and sessions have a unique token lookup index.

The site requires MongoDB at runtime. The local container has no database authentication and is loopback-only; do not expose it publicly. For production, set `MONGODB_URI` to a persistent authenticated MongoDB service, configure backups/access restrictions, use the HTTPS `APP_ORIGIN`, and supply separate admin credentials/JWT secret. Never point a deployed site at the local container. GridFS content and the database must be backed up together. Uploaded images are public once their URL is known; unused uploads are retained, not automatically deleted.

The initial producer funding totals were copied from the previous static site, not verified payment records. Confirm those values before public use. Cashfree is **planned only**: see [Cashfree payment plan](docs/CASHFREE-PLAN.md). Existing contribution email behavior remains active.

### Verification

```sh
npx playwright install chromium
npm run verify
```

Run browser tests after `npm run build`, with the local MongoDB container running. Playwright starts a separate production server at `http://127.0.0.1:3101`, generates test-only credentials, and uses a new `aproop_e2e_*` database that it deletes after the run. Your review server, credentials and content are not used. Tests exercise login, film/category/story CRUD, the four-step editor, validation, drafts, immediate homepage stars and their two-story limit, conflict rejection, uploads, desktop/tablet/mobile layouts, forged/expired sessions, CSRF rejection and logout revocation. Screenshots go to ignored `artifacts/` and failures to `test-results/`.

## Technical optimization results

See [operations and six-round results](docs/OPERATIONS-AND-RESULTS.md) for the
implemented improvements, measured comparisons and release checks,
[editor and lifecycle](docs/EDITOR-AND-LIFECYCLE.md) for browser/editor changes,
and [verification](docs/VERIFICATION.md) for the complete local test record.
