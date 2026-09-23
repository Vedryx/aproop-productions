/** No automatic retries: a failed response may still represent a committed save. */
export async function adminRequest<T>(url: string, init: RequestInit, timeoutMs = 45_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const data = await response.json().catch(() => null);
    if (!response.ok)
      throw new Error(typeof data?.error === "string" ? data.error : "The service is unavailable. Please try again.");
    if (!data || typeof data !== "object")
      throw new Error("The service returned an invalid response. Please try again.");
    return data as T;
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error("The request timed out. Please check the latest saved content before retrying.");
    if (error instanceof TypeError)
      throw new Error("Network trouble. Please try again.");
    throw error;
  } finally { clearTimeout(timer); }
}
