import { deleteSession } from "@/lib/admin/auth";
import { failure, json, sameOrigin } from "@/lib/admin/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await deleteSession();
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
