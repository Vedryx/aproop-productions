import ky, { isHTTPError, isNetworkError, isTimeoutError, type Options } from "ky";

export type ApiErrorKind = "http" | "network" | "timeout" | "invalid-response";
export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    message: string,
    public readonly status?: number,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const client = ky.create({
  credentials: "same-origin",
  cache: "no-store",
  // A mutation may already have committed when its response is lost.
  retry: 0,
  timeout: 45_000,
  totalTimeout: 45_000,
});

type RequestOptions = Pick<Options, "method" | "json" | "body" | "headers" | "signal">;

/** All endpoint adapters validate successful responses at this boundary. */
export async function requestJson<T>(
  url: string,
  options: RequestOptions,
  decode: (data: unknown) => T,
  timeoutMs = 45_000,
): Promise<T> {
  try {
    const data = await client(url, { ...options, timeout: timeoutMs, totalTimeout: timeoutMs }).json<unknown>();
    try { return decode(data); }
    catch { throw new ApiError("invalid-response", "The service returned an invalid response. Please try again."); }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (isHTTPError(error)) {
      const data = error.data;
      const message = data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error : "The service is unavailable. Please try again.";
      throw new ApiError("http", message, error.response.status, error.response.headers.get("x-request-id") ?? undefined);
    }
    if (isTimeoutError(error))
      throw new ApiError("timeout", "The request timed out. Please check the latest saved content before retrying.");
    if (error instanceof SyntaxError)
      throw new ApiError("invalid-response", "The service returned an invalid response. Please try again.");
    if (isNetworkError(error) || error instanceof TypeError)
      throw new ApiError("network", "Network trouble. Please try again.");
    throw error; // Preserve caller cancellation rather than misreporting it.
  }
}

export function decodeAcknowledgement(data: unknown): { ok: true } {
  if (!data || typeof data !== "object" || !("ok" in data) || data.ok !== true)
    throw new Error("Missing acknowledgement");
  return { ok: true };
}
