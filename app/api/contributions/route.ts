import { contributionInput } from "@/lib/payments/model";
import {
  beginContribution,
  publicContribution,
  reconcileBatch,
} from "@/lib/payments/service";
import {
  failure,
  HttpError,
  json,
  readJson,
  sameOrigin,
} from "@/lib/admin/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const parsed = contributionInput.safeParse(await readJson(request, 12000));
    if (!parsed.success)
      throw new HttpError(parsed.error.issues[0].message, 400);
    await reconcileBatch(parsed.data.projectId, 3);
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    return json(
      publicContribution(await beginContribution(parsed.data, ip)),
      201,
    );
  } catch (error) {
    return failure(error);
  }
}
