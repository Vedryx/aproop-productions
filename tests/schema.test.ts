import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { contentSchema, youtubeId, type Content } from "../lib/admin/schema";
import { setFeatured } from "../lib/admin/featured";
import { projects } from "../lib/producer";
const content = (): Content => ({
  revision: 0,
  shelves: [],
  projects: projects.map((p, i) => ({
    ...p,
    id: randomUUID(),
    published: true,
    homepageSlot: (i + 1) as 1 | 2,
  })),
});
test("normalizes video links and refuses unrelated domains", () => {
  assert.equal(youtubeId("https://youtu.be/1r97KROnFFM?t=3"), "1r97KROnFFM");
  assert.equal(
    youtubeId("https://www.youtube.com/watch?v=1r97KROnFFM"),
    "1r97KROnFFM",
  );
  assert.equal(
    youtubeId("https://youtube.com/shorts/1r97KROnFFM"),
    "1r97KROnFFM",
  );
  assert.equal(
    youtubeId("https://evil.test/watch?v=1r97KROnFFM"),
    "https://evil.test/watch?v=1r97KROnFFM",
  );
});
test("allows complete deletion without restoring seed content", () => {
  assert.ok(
    contentSchema.safeParse({ revision: 4, shelves: [], projects: [] }).success,
  );
});
test("rejects duplicate homepage slots and unpublished featured stories", () => {
  const data = content();
  assert.ok(contentSchema.safeParse(data).success);
  data.projects[1].homepageSlot = 1;
  assert.equal(contentSchema.safeParse(data).success, false);
  data.projects[1].homepageSlot = 2;
  data.projects[0].published = false;
  assert.equal(contentSchema.safeParse(data).success, false);
});
test("rejects invalid goals, duplicate amounts, script image URLs and duplicate IDs", () => {
  for (const patch of [
    { need: 0 },
    { need: -100 },
    { options: [] },
    { options: [100, 100] },
    { options: [1.5] },
    { poster: "javascript:alert(1)" },
    { poster: "//evil.test/a.png" },
    { poster: "/uploads/../secret" },
  ]) {
    const data = content();
    Object.assign(data.projects[0], patch);
    assert.equal(
      contentSchema.safeParse(data).success,
      false,
      JSON.stringify(patch),
    );
  }
  const data = content();
  data.projects[1].id = data.projects[0].id;
  assert.equal(contentSchema.safeParse(data).success, false);
});

test("incomplete drafts can be saved but cannot be published", () => {
  const data = content();
  const draft = data.projects[0];
  Object.assign(draft, {
    published: false,
    homepageSlot: 0,
    poster: "",
    ph: "",
    synopsis: "",
    director: "",
  });
  assert.ok(contentSchema.safeParse(data).success);
  draft.published = true;
  assert.equal(contentSchema.safeParse(data).success, false);
});

test("stars enforce the cap, reuse free slots and preserve the source", () => {
  const original = content();
  const third = {
    ...original.projects[0],
    id: randomUUID(),
    homepageSlot: 0 as const,
  };
  original.projects.push(third);
  assert.throws(() => setFeatured(original, third.id, true), /Only two/);
  assert.deepEqual(
    setFeatured(original, original.projects[0].id, true),
    original,
  );
  const unstarred = setFeatured(original, original.projects[0].id, false);
  assert.equal(original.projects[0].homepageSlot, 1);
  const starred = setFeatured(unstarred, third.id, true);
  assert.equal(starred.projects[2].homepageSlot, 1);
  third.published = false;
  assert.throws(() => setFeatured(original, third.id, true), /publish/);
});
