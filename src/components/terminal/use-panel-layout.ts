"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "agele-panel-layout-v1";
export const DEFAULT_LAYOUT = { markets: 248, ticket: 304, chart: 0.68, order: 0.66 };
type Layout = typeof DEFAULT_LAYOUT;

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

const DESKTOP_QUERY = "(min-width: 1024px)";
function subscribeDesktop(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function useDesktopTerminal() {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}

export function panelWidths(
  width: number,
  desktop: boolean,
  collapsed: boolean,
  layout: Pick<Layout, "markets" | "ticket">,
) {
  const gutters = desktop ? 12 : 6;
  const marketsMax = collapsed ? 48 : clamp(width - 360 - gutters - clamp(layout.ticket, 260, 440), 200, 380);
  const markets = collapsed ? 48 : clamp(layout.markets, 200, marketsMax);
  const ticketMax = clamp(width - 360 - gutters - (desktop ? markets : 0), 260, 440);
  return { markets, marketsMax, ticket: clamp(layout.ticket, 260, ticketMax), ticketMax };
}

export function parseLayout(raw: string | null): Layout {
  try {
    const value = JSON.parse(raw ?? "null");
    return Object.fromEntries(
      Object.entries(DEFAULT_LAYOUT).map(([key, fallback]) => {
        const saved = value?.[key];
        const [min, max] = key === "markets" ? [200, 380] : key === "ticket" ? [260, 440] : [0, 1];
        return [key, typeof saved === "number" && Number.isFinite(saved) ? clamp(saved, min, max) : fallback];
      }),
    ) as Layout;
  } catch {
    return { ...DEFAULT_LAYOUT };
  }
}

export function usePanelLayout() {
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  useEffect(() => {
    try {
      setLayout(parseLayout(localStorage.getItem(STORAGE_KEY)));
    } catch {
      /* Storage is optional. */
    }
  }, []);
  const update = (patch: Partial<Layout>) =>
    setLayout((previous) => {
      const next = { ...previous, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* Storage is optional. */
      }
      return next;
    });
  return { layout, update };
}

export function usePanelSize() {
  const [element, ref] = useState<HTMLElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return { ref, ...size };
}
