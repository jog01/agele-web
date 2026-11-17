"use client";

import { useEffect } from "react";

export function useHotkey(
  match: (e: KeyboardEvent) => boolean,
  handler: () => void,
  { ignoreInputs = false } = {},
) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ignoreInputs) {
        const el = e.target as HTMLElement | null;
        if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      }
      if (!match(e)) return;
      e.preventDefault();
      handler();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [match, handler, ignoreInputs]);
}
