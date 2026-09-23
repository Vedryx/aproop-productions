"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Source } from "@/lib/contact";

export type Status = "idle" | "sending" | "sent" | "error";

/**
 * Submit logic shared by the Contact form and the pitch modal: posts the form
 * to /api/contact and tracks what to show on the button.
 *
 * `mountedAt` pairs with the timing trap on the server — a real person takes
 * more than two seconds to fill this in, a script does not.
 */
export function useEnquiry(source: Source) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const attempt = useRef<{ payload: string; id: string } | null>(null);
  // Stamped on mount rather than during render: reading the clock while
  // rendering is impure, and on the server it would record the wrong clock
  // entirely. Zero until then, which the server reads as "not a bot".
  const mountedAt = useRef(0);
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setError("");
  }, []);

  const submit = useCallback(
    async (form: HTMLFormElement) => {
      if (inFlight.current) return false;
      inFlight.current = true;
      setStatus("sending");
      setError("");

      const fd = new FormData(form);
      const get = (k: string) => String(fd.get(k) ?? "");
      const payload = {
        name: get("name").trim(), email: get("email").trim(),
        kind: get("kind").trim(), note: get("note").trim(), source,
      };

      try {
        const fingerprint = JSON.stringify(payload);
        if (attempt.current?.payload !== fingerprint)
          attempt.current = { payload: fingerprint, id: crypto.randomUUID() };
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "content-type": "application/json", "Idempotency-Key": attempt.current.id },
          signal: AbortSignal.timeout(45_000),
          body: JSON.stringify({
            ...payload,
            website: get("website"), // honeypot
            t: mountedAt.current,
          }),
        });
        const data = (await res.json().catch(() => null)) as
          | { ok?: boolean; error?: string }
          | null;

        if (!res.ok || !data?.ok) {
          setError(data?.error || "Something went wrong. Please email us directly.");
          setStatus("error");
          return false;
        }
        attempt.current = null;
      } catch {
        setError("Network trouble. Please email us directly.");
        setStatus("error");
        return false;
      } finally {
        inFlight.current = false;
      }

      form.reset();
      setStatus("sent");
      return true;
    },
    [source],
  );

  return { status, error, submit, reset };
}
