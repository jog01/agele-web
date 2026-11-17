"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { mergeTokenPrice, mergeTrendingPrice, priceTickSchema } from "@/lib/api/live-data";
import { tokenQueries } from "@/lib/api/queries";
import { realtime } from "@/lib/realtime";

export function useLivePrices(mints: string[]) {
  const qc = useQueryClient();
  const mintKey = JSON.stringify([...new Set(mints)].sort());
  useEffect(() => {
    const subscribedMints = JSON.parse(mintKey) as string[];
    const off = subscribedMints.map((mint) =>
      realtime.subscribe(`token:${mint}:price`, (data) => {
        const parsed = priceTickSchema.safeParse(data);
        if (!parsed.success || parsed.data.mint !== mint) return;
        const tick = parsed.data;
        qc.setQueryData(tokenQueries.detail(mint).queryKey, (prev) => mergeTokenPrice(prev, tick));
        qc.setQueryData(tokenQueries.trending().queryKey, (prev) => mergeTrendingPrice(prev, tick));
      }),
    );
    const offReconnect = realtime.onReconnect(() => {
      void qc.invalidateQueries({ queryKey: tokenQueries.trending().queryKey, exact: true });
      for (const mint of subscribedMints) {
        void qc.invalidateQueries({ queryKey: tokenQueries.detail(mint).queryKey, exact: true });
      }
    });
    return () => {
      for (const unsubscribe of off) unsubscribe();
      offReconnect();
    };
  }, [mintKey, qc]);
}
