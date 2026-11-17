"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import type { Candle, Interval, Trade } from "@/lib/api/client";
import { tokenQueries } from "@/lib/api/queries";
import { foldTrade } from "@/lib/candles";
import { useLiveTrades } from "./use-live-trades";

export function useLiveCandles(mint: string, interval: Interval, onLivePrice?: (price: number) => void) {
  const snapshot = useQuery(tokenQueries.candles(mint, interval));
  const [live, setLive] = useState<{ key: string; candles: Candle[]; signatures: string[] }>({
    key: "",
    candles: [],
    signatures: [],
  });
  const key = `${mint}:${interval}:${snapshot.dataUpdatedAt}`;
  const onTrade = useCallback(
    (trade: Trade) => {
      onLivePrice?.(trade.priceUsd);
      setLive((previous) => {
        const signatures = previous.key === key ? previous.signatures : [];
        if (signatures.includes(trade.signature)) return previous;
        return {
          key,
          candles: foldTrade(
            previous.key === key ? previous.candles : (snapshot.data ?? []),
            trade,
            interval,
          ),
          signatures: [...signatures, trade.signature].slice(-500),
        };
      });
    },
    [key, onLivePrice, snapshot.data, interval],
  );
  useLiveTrades(mint, onTrade);
  const data = live.key === key ? live.candles : (snapshot.data ?? []);
  return { ...snapshot, data, snapshotKey: key };
}
