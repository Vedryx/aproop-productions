import { getContent } from "@/lib/admin/content";
import { fundingViews } from "@/lib/payments/store";
import { failure, json } from "@/lib/admin/http";
export async function GET() {
  try {
    const c = await getContent();
    const views = await fundingViews(c.projects.filter((p) => p.published));
    return json([...views.values()]);
  } catch (e) {
    return failure(e);
  }
}
