import { getSession } from "@/lib/admin/auth";
import { getContent, saveContent } from "@/lib/admin/content";
import { contentSchema } from "@/lib/admin/schema";
import {
  failure,
  HttpError,
  json,
  readJson,
  sameOrigin,
} from "@/lib/admin/http";
import { revalidatePath } from "next/cache";
export async function GET() {
  try {
    if (!(await getSession()))
      throw new HttpError("Please sign in again.", 401);
    return json(await getContent());
  } catch (error) {
    return failure(error);
  }
}
export async function PUT(request: Request) {
  try {
    sameOrigin(request);
    const session = await getSession();
    if (!session) throw new HttpError("Please sign in again.", 401);
    const parsed = contentSchema.safeParse(await readJson(request));
    if (!parsed.success)
      throw new HttpError(
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("\n"),
        400,
      );
    if (!(await saveContent(parsed.data, session.email)))
      throw new HttpError(
        "Another tab saved changes. Reload the editor before trying again; your changes have not overwritten theirs.",
        409,
      );
    revalidatePath("/");
    revalidatePath("/be-the-producer");
    return json({ ...parsed.data, revision: parsed.data.revision + 1 });
  } catch (error) {
    return failure(error);
  }
}
