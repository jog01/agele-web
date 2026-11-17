"use client";

import {
  createSeriesMarkers,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type Time,
} from "lightweight-charts";
import { type RefObject, useEffect, useRef, useState } from "react";
import type { Candle, Interval } from "@/lib/api/client";
import { swapMarkers } from "@/lib/swap-history";
import { useSwapHistory } from "./use-swap-history";

export function useSwapOverlay(
  mint: string,
  demoMode: boolean,
  candles: RefObject<ISeriesApi<"Candlestick"> | null>,
  line: RefObject<ISeriesApi<"Line"> | null>,
  style: "candles" | "line",
  snapshot: Candle[],
  interval: Interval,
) {
  const history = useSwapHistory();
  const [shown, setShown] = useState(false);
  const primitive = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const available = history.authenticated && !demoMode;
  useEffect(() => {
    const series = style === "candles" ? candles.current : line.current;
    if (!series) return;
    const markers = createSeriesMarkers(series, []);
    primitive.current = markers;
    return () => {
      primitive.current = null;
      markers.detach();
    };
  }, [candles, line, style]);
  useEffect(() => {
    const series = style === "candles" ? candles.current : line.current;
    if (!series) return;
    primitive.current?.setMarkers(
      available && shown && !history.isError ? swapMarkers(history.items, mint, snapshot, interval) : [],
    );
  }, [available, shown, history.items, history.isError, mint, style, snapshot, candles, line, interval]);
  return {
    shown: available && shown,
    disabled: !available,
    toggle: () => setShown((value) => !value),
    label: !available
      ? "My swaps · sign-in / live data required"
      : history.isError
        ? "My swaps · unavailable"
        : history.isPending
          ? "My swaps · loading"
          : "My swaps",
    title: !available
      ? "Sign in with live market data to view your swaps."
      : history.isError
        ? "Swap history unavailable. Open My swaps to retry."
        : "Confirmed swaps from loaded history pages. Load more in the My swaps tab for older markers.",
  };
}
