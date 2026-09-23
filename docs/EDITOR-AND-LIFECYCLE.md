# Editor performance and browser lifecycle

Round 5 preserves the existing screens, controls and save/publication workflow.

## Editor state

The editor keeps the saved content as an immutable object instead of serializing
and reparsing the entire document on every render. Section serialization is
memoized by section identity, so search, selection, notices and wizard navigation
do not repeat those comparisons. Saved item signatures are indexed by ID once
per saved snapshot; status badges no longer build and scan a combined saved list
for every row. The flattened film list is memoized separately.

Typing into film/story fields copies the affected item and containing collection,
reusing unrelated items and sections. Saved snapshots remain untouched. Poster
description auto-fill and clearing a star when unpublishing retain their prior
behavior. Reverting a field to its saved value returns the editor to clean state.
Less frequent structural operations (adding, deleting, moving or recategorizing)
still use a full defensive clone. No new autosave or persistence format is added.

The before-unload warning listener is attached only while edits are unsaved.
Existing optimistic revision checks, section-specific saves, immediate stars,
conflict handling and disabled-during-save controls remain in place.

## Public payloads

The server explicitly projects data before passing it to public Client Components.
The work grid receives category key/slot/number and film title/video/award only;
unused credits, editor IDs, publication flags and category metadata stay out of
that component's React payload. Producer cards retain the fields they render,
including story IDs for anchors, but omit publication and homepage-slot flags.
Both projection helpers also exclude drafts defensively. Admin API responses and
the cached server-side content model remain complete and unchanged.

Using the repository's seeded shelves with UUID-length film IDs, the work-grid
JSON representation decreases from **5,436 to 1,956 bytes** (3,480 bytes / 64%).
This measures that data slice, not the complete HTML, compressed network transfer,
JavaScript bundle, interaction latency or live Core Web Vitals. Dynamic content
will produce different totals.

## Lifecycle fixes

- Image and YouTube-thumbnail fallback state is keyed to its source. A failed
  image no longer hides a later valid image passed to the same component, and a
  new video starts at its own highest-quality thumbnail.
- Modal scroll locks are reference-counted and restore the prior inline overflow
  value after the last dialog releases its lock. Repeated cleanup is harmless.
- Service animation timeouts and queued animation frames are cancelled on unmount;
  their existing press animation and expansion timing stay the same.
- Reveal cleanup removes its document-level animation class as well as cancelling
  the queued frame and disconnecting observers.

## Verification

Unit tests verify immutable edit behavior, unchanged object reuse, edit/revert,
poster-description rules, publication/slot rules, public field projection and
nested scroll locks. Browser tests verify actual image-source recovery, service
unmount cleanup, reveal-class cleanup, editor dirty-state reversion and exclusion
of an editor-only credit marker from the public response while retaining it in
the admin API.

The component lifecycle tests build a temporary in-memory entry with esbuild
(an explicit development dependency) and serve a test-intercepted HTML document.
There is no production test route or browser harness bundle. The full suite also
runs the existing admin workflows and all 18 original visual baselines.
