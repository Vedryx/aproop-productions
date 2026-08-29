"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),iframe,[tabindex]:not([tabindex="-1"])';

/**
 * Keeps keyboard focus inside an open dialog and hands it back to whatever was
 * focused before. Without this, tabbing out of a modal lands on the page behind
 * the overlay, which is invisible to sighted keyboard users.
 */
export function useFocusTrap(
  open: boolean,
  container: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const node = container.current;
    if (!node) return;

    const previous = document.activeElement as HTMLElement | null;

    const targets = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el.tagName === "IFRAME",
      );

    // Move focus in, preferring the close control over the embedded iframe.
    const first = targets()[0];
    (first ?? node).focus?.();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = targets();
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === firstItem || !node.contains(active))) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && (active === lastItem || !node.contains(active))) {
        e.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      previous?.focus?.();
    };
  }, [open, container]);
}
