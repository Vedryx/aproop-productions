import assert from "node:assert/strict";
import test from "node:test";
import { shelfData } from "../lib/data";
import { projects } from "../lib/producer";
import type { Content } from "../lib/admin/schema";
import { indexSavedItems, patchFilm, patchProject } from "../lib/admin/editor-state";
import { publicProjects, publicShelves } from "../lib/public-content";
import { lockBodyScroll } from "../lib/scroll-lock";

function fixture(): Content {
  return { revision: 0,
    shelves: shelfData.map((s, si) => ({ ...s, films: s.films.map((f, fi) => ({ ...f,
      id: `film-${si}-${fi}`, published: true, award: !!f.award,
    })) })),
    projects: projects.map((p, i) => ({ ...p, id: `project-${i}`, published: true, homepageSlot: i + 1 as 1 | 2 })),
  };
}

test("field edits preserve saved snapshots and reuse unrelated content", () => {
  const original = fixture();
  const snapshot = JSON.stringify(original);
  const film = original.shelves[0].films[0];
  const changed = patchFilm(original, film.id, { title: "Changed" });
  assert.equal(JSON.stringify(original), snapshot);
  assert.equal(changed.projects, original.projects);
  assert.equal(changed.shelves[1], original.shelves[1]);
  assert.equal(changed.shelves[0].films[1], original.shelves[0].films[1]);
  assert.equal(changed.shelves[0].films[0].title, "Changed");
  const reverted = patchFilm(changed, film.id, { title: film.title });
  assert.equal(JSON.stringify(reverted), snapshot);
  const p = original.projects[0];
  const renamed = patchProject(original, p.id, { title: "New story", published: false });
  assert.equal(renamed.shelves, original.shelves);
  assert.equal(renamed.projects[1], original.projects[1]);
  assert.equal(renamed.projects[0].homepageSlot, 0);
  assert.equal(renamed.projects[0].ph, p.ph); // custom description survives
  const automatic = patchProject({ ...original, projects: [{ ...p, ph: `${p.title} — poster` }] }, p.id, { title: "New" });
  assert.equal(automatic.projects[0].ph, "New — poster");
  assert.equal(indexSavedItems(original).get(film.id)?.signature, JSON.stringify(film));
});

test("public projections remove drafts and editor fields without dropping rendered data", () => {
  const content = fixture();
  content.shelves[0].films[0].published = false;
  content.projects[0].published = false;
  const shelves = publicShelves(content.shelves);
  const stories = publicProjects(content.projects);
  assert.equal(shelves[0].films.length, content.shelves[0].films.length - 1);
  assert.deepEqual(Object.keys(shelves[0]).sort(), ["films", "key", "num", "slot"]);
  assert.deepEqual(Object.keys(shelves[0].films[0]).sort(), ["award", "title", "vid"]);
  assert.equal(stories.length, 1);
  assert.equal(stories[0].synopsis, content.projects[1].synopsis);
  assert.equal("homepageSlot" in stories[0], false);
  assert.equal("published" in stories[0], false);
  const before = Buffer.byteLength(JSON.stringify(content.shelves));
  const after = Buffer.byteLength(JSON.stringify(shelves));
  assert.ok(after < before);
});

test("overlapping modal locks restore existing overflow only after the final release", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  const body = { style: { overflow: "clip" } };
  Object.defineProperty(globalThis, "document", { configurable: true, value: { body } });
  try {
    const releaseA = lockBodyScroll();
    const releaseB = lockBodyScroll();
    assert.equal(body.style.overflow, "hidden");
    releaseA(); releaseA();
    assert.equal(body.style.overflow, "hidden");
    releaseB();
    assert.equal(body.style.overflow, "clip");
  } finally {
    if (original) Object.defineProperty(globalThis, "document", original);
    else Reflect.deleteProperty(globalThis, "document");
  }
});
