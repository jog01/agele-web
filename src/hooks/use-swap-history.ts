"use client";

import { useInfiniteQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { tokenQueries } from "@/lib/api/queries";
import { realtime } from "@/lib/realtime";
import { solanaCluster } from "@/lib/solana/cluster";
import { historyItems, swapHistoryKey, swapHistoryQuery } from "@/lib/swap-history";

export function useSwapHistory() {
  const auth = useAuth();
  const qc = useQueryClient();
  const query = useInfiniteQuery(swapHistoryQuery(auth));
  const viewer = swapHistoryKey(auth)[1];
  useEffect(() => {
    if (!auth.authenticated) return;
    const off = realtime.onReconnect(() => {
      void qc.invalidateQueries({ queryKey: ["swaps", viewer] });
    });
    return () => {
      off();
    };
  }, [auth.authenticated, viewer, qc]);
  const items = useMemo(
    () => (auth.authenticated ? historyItems(query.data?.pages) : []),
    [query.data, auth.authenticated],
  );
  return { ...query, items, authenticated: auth.authenticated };
}

export function useSwapHistoryTokens(mints: string[]) {
  const unique = [...new Set(mints)].filter((mint) => mint !== solanaCluster().usdcMint);
  const queries = useQueries({
    queries: unique.map((mint) => ({ ...tokenQueries.detail(mint), retry: false })),
  });
  return queries.flatMap((query) => (query.data ? [query.data] : []));
}
