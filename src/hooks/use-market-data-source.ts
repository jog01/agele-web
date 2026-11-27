"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useAuth } from "@/components/auth/auth-context";
import { api, unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

type MarketDataSource = components["schemas"]["Health"]["marketData"];

const healthSchema = z.object({ marketData: z.enum(["mock", "live", "indexed"]) });

export function useMarketDataSource(): MarketDataSource {
  const query = useQuery({
    queryKey: ["health", "market-data"],
    queryFn: async ({ signal }) => {
      const health = healthSchema.safeParse(unwrap(await api.GET("/health", { signal })));
      return health.success ? health.data.marketData : "mock";
    },
    retry: false,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
  return query.isError ? "mock" : (query.data ?? "mock");
}

export function useMarketDataMode() {
  const source = useMarketDataSource();
  const auth = useAuth();
  const demoMode = source === "mock" || !auth.configured;
  return { source, demoMode, tradingDisabled: demoMode || !auth.ready || !auth.authenticated };
}
