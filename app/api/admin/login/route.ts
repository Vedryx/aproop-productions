import { z } from "zod";
import { allowLogin, createSession, credentialsMatch } from "@/lib/admin/auth";
import {
  failure,
  HttpError,
  json,
  readJson,
  sameOrigin,
} from "@/lib/admin/http";
export async function POST(request: Request) {
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
    if (!(await allowLogin()))
      throw new HttpError(
        "Too many sign-in attempts. Try again in 15 minutes.",
        429,
      );
    if (!credentialsMatch(input.data.email, input.data.password))
      throw new HttpError("Email or password is incorrect.", 401);
    await createSession();
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
