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
      setStatus("sending");
      setError("");

      const fd = new FormData(form);
      const get = (k: string) => String(fd.get(k) ?? "");

      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: get("name"),
            email: get("email"),
            kind: get("kind"),
            note: get("note"),
            website: get("website"), // honeypot
            t: mountedAt.current,
            source,
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
      } catch {
        setError("Network trouble. Please email us directly.");
        setStatus("error");
        return false;
      }

      form.reset();
      setStatus("sent");
      return true;
    },
    [source],
  );

  return { status, error, submit, reset };
}
