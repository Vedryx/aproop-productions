import type { Content } from "./schema";

export function setFeatured(
  content: Content,
  id: string,
  featured: boolean,
): Content {
  const next = structuredClone(content);
  const project = next.projects.find((p) => p.id === id);
  if (!project)
    throw new Error("This story no longer exists. Reload the editor.");
  if (!featured) {
    project.homepageSlot = 0;
    return next;
  }
  if (!project.published)
    throw new Error("Save and publish this story before starring it.");
  if (project.homepageSlot) return next;
  const slots = next.projects
    .filter((p) => p.homepageSlot)
    .map((p) => p.homepageSlot);
  if (slots.length >= 2)
    throw new Error(
      "Only two stories can be starred. Unstar another story first.",
    );
  project.homepageSlot = slots.includes(1) ? 2 : 1;
  return next;
}
