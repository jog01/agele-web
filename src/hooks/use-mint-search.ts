"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, type Token } from "@/lib/api/client";
import { tokenQueries } from "@/lib/api/queries";

export function useMintSearch(mint: string | null, trending: Token[], enabled: boolean) {
  const trendingMatch = mint ? trending.find((token) => token.mint === mint) : undefined;
  const shouldFetch = enabled && mint !== null && !trendingMatch;
  const lookup = useQuery({
    ...tokenQueries.detail(mint ?? ""),
    enabled: shouldFetch,
    refetchInterval: false,
    retry: false,
  });
  const token = trendingMatch ?? lookup.data;
  return {
    token,
    isPending: shouldFetch && lookup.isPending,
    isError: shouldFetch && lookup.isError && !token,
    isNotFound: lookup.error instanceof ApiError && lookup.error.status === 404,
  };
}
