import type { AdminProject, Content } from "./admin/schema";

export type PublicProject = Omit<AdminProject, "published" | "homepageSlot">;
export type PublicFilm = { title: string; vid: string; award: boolean };
export type PublicShelf = { key: string; slot: string; num: string; films: PublicFilm[] };

/** Explicit browser projections keep editor-only fields out of React payloads. */
export function publicShelves(shelves: Content["shelves"]): PublicShelf[] {
  return shelves.map(({ key, slot, num, films }) => ({ key, slot, num,
    films: films.filter((f) => f.published).map(({ title, vid, award }) => ({ title, vid, award })),
  }));
}
export function publicProjects(projects: AdminProject[]): PublicProject[] {
  return projects.filter((p) => p.published).map((p) => ({
    id: p.id, title: p.title, kind: p.kind, ph: p.ph, poster: p.poster,
    synopsis: p.synopsis, director: p.director, stage: p.stage, closes: p.closes,
    need: p.need, raised: p.raised, backers: p.backers, options: p.options,
  }));
}
