"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Interval } from "@/lib/api/client";

interface TerminalState {
  interval: Interval;
  watchlist: string[];
  setInterval: (interval: Interval) => void;
  toggleWatch: (mint: string) => void;
}

export const useTerminalStore = create<TerminalState>()(
  persist(
    (set) => ({
      interval: "15m",
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
