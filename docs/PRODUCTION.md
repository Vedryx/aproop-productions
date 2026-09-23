# Aproop production deployment

Existing Vercel project: `vedryx-tech/aproop-productions`.
Canonical origin: `https://www.aproopproductions.com`; admin: `/admin`.

## Configuration

Production uses Atlas database `aproop_production`; the admin feature branch preview uses `aproop_staging`. Production and preview use different admin credentials and JWT keys. Local development continues using its local MongoDB container.

Set `MONGODB_URI`, `MONGODB_DB`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `ADMIN_JWT_SECRET` in Vercel. Set production `APP_ORIGIN` to the exact canonical origin. Preview uses same-origin validation against its request URL. Keep `RESEND_API_KEY`, `CONTACT_FROM` and `CONTACT_TO` configured for email enquiries.

Secrets belong in Vercel environment settings. Local handoff files under `artifacts/` and `.env*` are excluded from Git and Vercel uploads. Never put secrets in command arguments, source or screenshots.

Posters are limited to 4 MiB on both client and server to stay below Vercel's 4.5 MB function payload limit. Existing source posters are deployed assets; admin uploads persist in MongoDB GridFS.

## Release checks

1. Run lint, build, unit tests and browser tests with the isolated local test database.
2. Build a preview with the staging database. Verify login, content changes, image uploads, homepage publication and logout. Remove verification content afterward.
3. Build production with `vercel deploy --prod --skip-domain`. Check the staged deployment before assigning the domain with `vercel promote`.
4. Verify the canonical domain, admin login, protected endpoints, original public content and image delivery after promotion.
5. Keep the previous production deployment ID for `vercel rollback` if live verification fails.

An empty database imports the original source content once. Local trial stories and local sessions are not copied. Cashfree is implemented on the local payment branch. It remains disabled until configured and has not been released. See [Cashfree setup and verification](CASHFREE-PLAN.md). Local payment testing must use a separate sandbox database.

Before later automatic releases, merge the reviewed admin branch into the repository's configured production branch (`main`). A manual CLI release does not update Git's production branch.

Backups must also cover `funding_campaigns`, `contributions`, `payment_events`, and `payment_refunds` once payments are enabled. Backups must cover `site_content` and both GridFS collections (`media.files` and `media.chunks`). Configure Atlas backups for the chosen cluster tier; maintain an export before data migrations. Code rollback does not roll back database content.
