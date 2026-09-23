import { projectSchema, type AdminProject } from "./schema";

export const STORY_STEPS = [
  "Story details",
  "Poster",
  "Funding",
  "Review & publish",
];
const FIELDS = [
  ["title", "kind", "synopsis", "director", "stage", "closes"],
  ["poster", "ph"],
  ["need", "raised", "backers", "options"],
  ["published", "homepageSlot"],
];
export function storyStepFor(field: string) {
  return Math.max(
    0,
    FIELDS.findIndex((fields) => fields.includes(field)),
  );
}
export function storyIssues(project: AdminProject, step?: number) {
  const result = projectSchema.safeParse({ ...project, published: true });
  const errors: Record<string, string> = {};
  if (!result.success)
    for (const issue of result.error.issues) {
      const field = String(issue.path[0]);
      if (step === undefined || FIELDS[step].includes(field))
        errors[field] ??= issue.message;
    }
  return errors;
}
