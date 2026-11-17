"use client";

import { useCallback, useState } from "react";
import type { Token, Trade } from "@/lib/api/client";
import { newestTokenPrice } from "@/lib/api/live-data";
import { useLiveTrades } from "./use-live-trades";

export function useLiveTokenPrice(mint: string, token: Token | undefined) {
  const [trade, setTrade] = useState<Trade | null>(null);
  const onTrade = useCallback((next: Trade) => {
    setTrade((prev) => (prev?.mint === next.mint && prev.time > next.time ? prev : next));
  }, []);
  useLiveTrades(mint, onTrade);
  return newestTokenPrice(mint, token, trade);
}
