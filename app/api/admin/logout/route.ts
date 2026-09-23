import { withDiagnostics } from "@/lib/server/diagnostics";
import { deleteSession } from "@/lib/admin/auth";
import { failure, json, sameOrigin } from "@/lib/admin/http";
async function handlePOST(request: Request) {
  try {
    sameOrigin(request);
    await deleteSession();
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}

export const POST = withDiagnostics("/api/admin/logout", handlePOST);
