import { z } from "zod";

const text = (max = 200) =>
  z
    .string()
    .trim()
    .min(1, "This field is required.")
    .max(max, `Keep this under ${max} characters.`);
const money = z.number().int().min(0).max(1_000_000_000);
export function youtubeId(value: string): string {
  const input = value.trim();
  if (/^[\w-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input);
    if (!["https:", "http:"].includes(url.protocol)) return input;
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return url.pathname.slice(1).split("/")[0];
    if (
      ["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)
    ) {
      return (
        url.searchParams.get("v") ||
        url.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/)?.[1] ||
        input
      );
    }
  } catch {}
  return input;
}
export const imagePath = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    if (/^\/(?:uploads|media)\/[\w./-]+$/.test(value) && !value.includes(".."))
      return true;
    try {
      const u = new URL(value);
      return u.protocol === "https:" && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Upload an image or enter an HTTPS image URL.");
export const filmSchema = z
  .object({
    id: z.string().uuid(),
    title: text(),
    client: z.string().trim().max(300, "Keep this under 300 characters."),
    vid: z
      .string()
      .transform(youtubeId)
      .pipe(
        z
          .string()
          .regex(
            /^(?:[\w-]{11})?$/,
            "Enter a valid YouTube link or 11-character video ID.",
          ),
      ),
    award: z.boolean(),
    published: z.boolean(),
  })
  .superRefine((film, ctx) => {
    if (!film.published) return;
    if (!film.vid)
      ctx.addIssue({
        code: "custom",
        path: ["vid"],
        message: "Add a YouTube video before publishing.",
      });
    if (!film.client)
      ctx.addIssue({
        code: "custom",
        path: ["client"],
        message: "Add the client or credit before publishing.",
      });
  });
export const shelfSchema = z.object({
  key: text(80).refine(
    (v) => v !== "All",
    'The category name "All" is reserved.',
  ),
  num: text(10),
  short: text(),
  projectLine: z.string().max(500),
  title: text(),
  line: z.string().max(1000),
  meta: z.string().max(300),
  slot: text(),
  ph: text(),
  award: z.boolean().optional(),
  list: z.string().max(150),
  films: z.array(filmSchema).max(500),
});
export const projectSchema = z
  .object({
    id: z.string().uuid(),
    title: text(),
    kind: z.string().trim().max(80),
    ph: z.string().trim().max(200),
    poster: z.union([z.literal(""), imagePath]),
    synopsis: z.string().trim().max(5000),
    director: z.string().trim().max(200),
    stage: z.string().trim().max(200),
    closes: z.string().trim().max(100),
    need: money.min(1),
    raised: money,
    backers: z.number().int().min(0).max(10_000_000),
    options: z
      .array(money.min(1))
      .min(1)
      .max(6)
      .refine(
        (v) => new Set(v).size === v.length,
        "Contribution amounts must be different.",
      ),
    published: z.boolean(),
    homepageSlot: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  })
  .superRefine((project, ctx) => {
    if (!project.published) return;
    for (const field of [
      "kind",
      "ph",
      "poster",
      "synopsis",
      "director",
      "stage",
      "closes",
    ] as const) {
      if (!project[field])
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: "Complete this field before publishing.",
        });
    }
  });
export const contentSchema = z
  .object({
    revision: z.number().int().min(0),
    shelves: z.array(shelfSchema).max(30),
    projects: z.array(projectSchema).max(200),
  })
  .superRefine((value, ctx) => {
    const error = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    if (
      new Set(value.shelves.map((s) => s.key.toLowerCase())).size !==
      value.shelves.length
    )
      error("Category names must be unique.");
    const ids = [
      ...value.shelves.flatMap((s) => s.films.map((f) => f.id)),
      ...value.projects.map((p) => p.id),
    ];
    if (new Set(ids).size !== ids.length) error("Content IDs must be unique.");
    const slots = value.projects.filter((p) => p.homepageSlot !== 0);
    if (slots.some((p) => !p.published))
      error("Publish a story before featuring it on the homepage.");
    if (new Set(slots.map((p) => p.homepageSlot)).size !== slots.length)
      error("Only one story can occupy each homepage slot.");
  });
export type Content = z.infer<typeof contentSchema>;
export type AdminFilm = z.infer<typeof filmSchema>;
export type AdminProject = z.infer<typeof projectSchema>;
