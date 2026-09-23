# Media delivery and validation

Round 4 preserves the public layout, artwork pixels, hero video and sound controls.

## Uploads

The authenticated, same-origin upload endpoint keeps its 4 MiB input limit and
accepts still JPEG, PNG and WebP images. It now checks actual decoded image data
with Sharp instead of trusting a signature or the request Content-Type. Corrupt,
truncated, unsupported, animated and over-25-megapixel images are rejected before
opening a GridFS upload. Original accepted bytes are stored without recompression,
with detected type and dimensions in metadata. Existing stored files are unchanged.

Both declared length and streamed bytes are bounded. Body reads have a 15-second
deadline; oversize and stalled streams are cancelled. GridFS writes have a
10-second database timeout and an attempted abort/cleanup on failure. A database
outage can prevent cleanup; this is not a guarantee against orphaned chunks.

Sharp is an explicit, pinned runtime dependency. Validation buffers at most 4 MiB
of compressed input, plus decoder memory bounded by the pixel limit; uploads are
not zero-copy. Keep normal deployment request/concurrency limits in place.

## Downloads

`/media/[id]` now sends GridFS chunks through a Node-to-Web stream instead of
collecting the entire image before responding. Its Web queue uses byte accounting
and a 64 KiB high-water mark (a single GridFS chunk may exceed that mark). Node and
MongoDB maintain their own internal buffers, so this is not a total-memory cap.
Cancellation/error destroys the stream and explicitly aborts its storage cursor.
Metadata lookup and download have 5- and 15-second database timeouts respectively.
A mid-stream storage failure terminates the response; it cannot replace already
sent headers with a JSON error.

The existing one-year immutable cache policy and content security headers remain.
Object IDs identify immutable uploads. ETags allow 304 responses; explicit HEAD
returns metadata without opening the file body. Missing IDs return 404. New
uploads get new IDs; replacing bytes under an existing ID would violate this
cache contract. This image endpoint does not add partial-range responses.

## Static media

`python3 scripts/optimize-png.py public/uploads/*.png` losslessly recompresses and
refilters supported PNG scanlines while preserving ancillary chunks, including
color metadata. It verifies reconstructed samples before replacing a file and
only writes smaller output. The final images were also decoded and compared
against their Git originals with Sharp: every decoded pixel matched.

| Asset | Before (bytes) | After (bytes) |
| --- | ---: | ---: |
| aproop-logo-hero.png | 86,505 | 68,580 |
| founders-cutout.png | 139,413 | 139,148 |
| logo-big.png | 19,515 | 13,014 |
| makers-bg.png | 538,702 | 535,911 |

Total reduction: **27,482 bytes**. This is an asset-size measurement, not a claimed
page-load or Core Web Vitals improvement. File URLs and rendered dimensions stay
the same. JPEG artwork remains unchanged to preserve quality.

The 10,913,248-byte hero MP4 already places its `moov` metadata before `mdat`
(fast start). Its original 1920×1080 H.264 picture and AAC soundtrack are retained;
no lossy re-encode or mobile crop was introduced. The production-server test
checks a real 1,024-byte HTTP range response, advancing playback, intrinsic video
width and both sound toggles. Autoplay can still be restricted by user/browser
policy. This verification does not measure slow-mobile-network playback or the
live hosting provider's CDN behavior.

## Verification

Unit tests cover input size/time limits, cancellation, corrupt signatures,
truncation, unsupported formats, pixel limits and stream backpressure/cleanup.
Production-server integration tests exercise JPEG/PNG/WebP upload and byte-exact
download, a multi-chunk PNG, HEAD, ETag revalidation, missing files, and rejection
without stored-file creation. Admin browser tests still exercise the upload UI.
Their old PNG fixture was corrupt and has been replaced with a valid 1×1 PNG.
The original 18 visual snapshots remain unchanged.
