"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Trade } from "@/lib/api/client";
import { tokenQueries } from "@/lib/api/queries";
import { realtime } from "@/lib/realtime";

const MAX_TRADES = 60;

/** Merges live trades for a mint into the React Query cache; re-snapshots after reconnect. */
export function useLiveTrades(mint: string, onTrade?: (trade: Trade) => void) {
  const qc = useQueryClient();
  useEffect(() => {
    const key = tokenQueries.trades(mint).queryKey;
    const off = realtime.subscribe(`token:${mint}:trades`, (data) => {
      const trade = data as Trade;
      if (trade.mint !== mint) return;
      qc.setQueryData(key, (prev: Trade[] | undefined) => {
        if (prev?.some((t) => t.signature === trade.signature)) return prev;
        return [trade, ...(prev ?? [])].slice(0, MAX_TRADES);
      });
      onTrade?.(trade);
    });
    const offReconnect = realtime.onReconnect(() => qc.invalidateQueries({ queryKey: ["tokens", mint] }));
    return () => {
      off();
      offReconnect();
    };
  }, [mint, qc, onTrade]);
}
