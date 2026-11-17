"use client";

import { createSeriesMarkers, type ISeriesApi } from "lightweight-charts";
import { type RefObject, useEffect, useState } from "react";
import type { Candle } from "@/lib/api/client";
import { swapMarkers } from "@/lib/swap-history";
import { useSwapHistory } from "./use-swap-history";

export function useSwapOverlay(
  mint: string,
  demoMode: boolean,
  candles: RefObject<ISeriesApi<"Candlestick"> | null>,
  line: RefObject<ISeriesApi<"Line"> | null>,
  style: "candles" | "line",
  snapshot: Candle[],
) {
  const history = useSwapHistory();
  const [shown, setShown] = useState(false);
  const available = history.authenticated && !demoMode;
  useEffect(() => {
    const series = style === "candles" ? candles.current : line.current;
    if (!series || !snapshot.length) return;
    const markers = createSeriesMarkers(
      series,
      available && shown && !history.isError ? swapMarkers(history.items, mint) : [],
    );
    return () => markers.detach();
  }, [available, shown, history.items, history.isError, mint, candles, line, style, snapshot]);
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
