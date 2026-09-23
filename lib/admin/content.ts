import "server-only";
import { randomUUID } from "node:crypto";
import { shelfData } from "@/lib/data";
import { projects } from "@/lib/producer";
import { database } from "./db";
import { contentSchema, type Content } from "./schema";

const publishable = [
  "kind",
  "ph",
  "poster",
  "synopsis",
  "director",
  "stage",
  "closes",
] as const satisfies readonly (keyof (typeof projects)[number])[];
type ContentDocument = Content & {
  _id: string;
  updatedAt: Date;
  updatedBy: string;
};
function seed(): Content {
  return contentSchema.parse({
    revision: 0,
    shelves: shelfData.map((s) => ({
      ...s,
      films: s.films.map((f) => ({
        ...f,
        id: randomUUID(),
        award: !!f.award,
        published: true,
      })),
    })),
    // A seed project only publishes once every field the schema demands of a
    // published story is filled in; the rest arrive as drafts for the studio to
    // finish. Homepage slots follow, because an unpublished story cannot hold one.
    projects: (() => {
      let slot = 0;
      return projects.map((p) => {
        const published = publishable.every((field) => p[field]);
        return {
          ...p,
          id: randomUUID(),
          published,
          homepageSlot: published && slot < 2 ? ++slot : 0,
        };
      });
    })(),
  });
}
export async function getContent(): Promise<Content> {
  const collection = (await database()).collection<ContentDocument>(
    "site_content",
  );
  let document = await collection.findOne({ _id: "main" });
  if (!document) {
    try {
      await collection.updateOne(
        { _id: "main" },
        {
          $setOnInsert: {
            ...seed(),
            updatedAt: new Date(),
            updatedBy: "initial-import",
          },
        },
        { upsert: true },
      );
    } catch (error) {
      if (!(
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      ))
        throw error;
    }
    document = await collection.findOne({ _id: "main" });
  }
  if (!document) throw new Error("Content could not be loaded.");
  return {
    revision: document.revision,
    shelves: document.shelves,
    projects: document.projects,
  };
}
export async function saveContent(
  content: Content,
  email: string,
): Promise<boolean> {
  const result = await (
    await database()
  )
    .collection<ContentDocument>("site_content")
    .updateOne(
      { _id: "main", revision: content.revision },
      {
        $set: {
          shelves: content.shelves,
          projects: content.projects,
          updatedAt: new Date(),
          updatedBy: email,
        },
        $inc: { revision: 1 },
      },
    );
  return result.modifiedCount === 1;
}
export async function getPublicContent() {
  const content = await getContent();
  return {
    shelves: content.shelves.map((s) => ({
      ...s,
      films: s.films.filter((f) => f.published),
    })),
    projects: content.projects.filter((p) => p.published),
  };
}
