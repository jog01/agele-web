"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Interval } from "@/lib/api/client";

interface TerminalState {
  interval: Interval;
  chartMode: "price" | "mcap";
  chartStyle: "candles" | "line";
  scaleMode: "normal" | "log" | "percent";
  range: "1D" | "5D" | "1M" | "All";
  ma7: boolean;
  ma25: boolean;
  setChartOptions: (
    options: Partial<Pick<TerminalState, "chartStyle" | "scaleMode" | "range" | "ma7" | "ma25">>,
  ) => void;
  setChartMode: (chartMode: "price" | "mcap") => void;
  watchlist: string[];
  setInterval: (interval: Interval) => void;
  toggleWatch: (mint: string) => void;
}

export const useTerminalStore = create<TerminalState>()(
  persist(
    (set) => ({
      interval: "15m",
      chartMode: "price",
      chartStyle: "candles",
      scaleMode: "normal",
      range: "All",
      ma7: false,
      ma25: false,
      setChartOptions: (options) => set(options),
      setChartMode: (chartMode) => set({ chartMode }),
      watchlist: [],
      setInterval: (interval) => set({ interval }),
      toggleWatch: (mint) =>
        set((s) => ({
          watchlist: s.watchlist.includes(mint)
            ? s.watchlist.filter((m) => m !== mint)
            : [...s.watchlist, mint],
        })),
    }),
    { name: "terminal-prefs" },
  ),
);
