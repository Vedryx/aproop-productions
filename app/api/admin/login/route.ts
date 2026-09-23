import { withDiagnostics } from "@/lib/server/diagnostics";
import { z } from "zod";
import { clientIdentity } from "@/lib/server/client-identity";
import { allowLogin, createSession, credentialsMatch } from "@/lib/admin/auth";
import {
  failure,
  HttpError,
  json,
  readJson,
  sameOrigin,
} from "@/lib/admin/http";
async function handlePOST(request: Request) {
  try {
    sameOrigin(request);
    const input = z
      .object({
        email: z.string().email().max(254),
        password: z.string().min(1).max(256),
      })
      .safeParse(await readJson(request, 4096));
    if (!input.success)
      throw new HttpError("Enter your email and password.", 400);
    const clientId = clientIdentity(request.headers, process.env.VERCEL === "1",
      process.env.TRUSTED_IP_HEADER || process.env.CONTACT_TRUSTED_IP_HEADER);
    if (!(await allowLogin(clientId)))
      throw new HttpError(
        "Too many sign-in attempts. Try again in 15 minutes.",
        429,
      );
    if (!(await credentialsMatch(input.data.email, input.data.password)))
      throw new HttpError("Email or password is incorrect.", 401);
    await createSession();
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}

export const POST = withDiagnostics("/api/admin/login", handlePOST);
