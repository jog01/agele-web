"use client";

import { useRef } from "react";

/** Controlled Radix dialogs have no Trigger ref to restore automatically. */
export function useDialogFocusReturn() {
  const opener = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus() {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    },
    onCloseAutoFocus(event: Event) {
      if (opener.current?.isConnected) {
        event.preventDefault();
        opener.current.focus({ preventScroll: true });
      }
    },
  };
}
