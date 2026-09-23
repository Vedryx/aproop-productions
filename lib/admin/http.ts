import "server-only";
import { HttpError } from "../server/http-error";
export { HttpError } from "../server/http-error";
export { readJson } from "../server/read-json";
export function sameOrigin(request: Request) {
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
  if (request.headers.get("origin") !== expected)
    throw new HttpError("This request must come from the admin website.", 403);
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return json({ error: error.message }, error.status);
  return json({ error: "The service is unavailable. Please try again." }, 503);
}
