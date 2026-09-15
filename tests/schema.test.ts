import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { contentSchema, youtubeId, type Content } from "../lib/admin/schema";
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
