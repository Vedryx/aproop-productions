import type { AdminFilm, AdminProject, Content } from "./schema";

export function patchFilm(content: Content, id: string, patch: Partial<AdminFilm>): Content {
  return { ...content, shelves: content.shelves.map((shelf) => {
    if (!shelf.films.some((film) => film.id === id)) return shelf;
    return { ...shelf, films: shelf.films.map((film) => film.id === id ? { ...film, ...patch } : film) };
  }) };
}

export function patchProject(content: Content, id: string, patch: Partial<AdminProject>): Content {
  return { ...content, projects: content.projects.map((project) => {
    if (project.id !== id) return project;
    const next = { ...project, ...patch };
    if (patch.title !== undefined && (!project.ph || project.ph === `${project.title} — poster`) && patch.ph === undefined)
      next.ph = `${patch.title} — poster`;
    if (!next.published) next.homepageSlot = 0;
    return next;
  }) };
}

export function indexSavedItems(content: Content) {
  return new Map([...content.shelves.flatMap((s) => s.films), ...content.projects]
    .map((item) => [item.id, { item, signature: JSON.stringify(item) }]));
}
