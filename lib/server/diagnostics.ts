import { randomUUID } from "node:crypto";

/** Fixed route labels only: never log URLs, headers, bodies or error messages. */
export function withDiagnostics<Args extends unknown[]>(
  route: string,
  handler: (request: Request, ...args: Args) => Promise<Response>,
) {
  return async (request: Request, ...args: Args): Promise<Response> => {
    const requestId = randomUUID();
    const start = performance.now();
    let response: Response;
    try { response = await handler(request, ...args); }
    catch {
      response = Response.json({ error: "The service is unavailable. Please try again." }, {
        status: 503, headers: { "Cache-Control": "no-store" },
      });
    }
    const durationMs = Math.round((performance.now() - start) * 10) / 10;
    response.headers.set("X-Request-ID", requestId);
    response.headers.set("Server-Timing", `app;dur=${durationMs}`);
    if (response.status >= 500 || durationMs >= 2000)
      console.error("[request]", { requestId, route, status: response.status, durationMs });
    return response;
  };
}
