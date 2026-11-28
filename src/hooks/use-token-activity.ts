"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/auth-context";
import { tokenQueries } from "@/lib/api/queries";
import type { HolderFilters } from "@/lib/api/token-holders";

export function useTokenPosition(mint: string) {
  return useQuery(tokenQueries.position(mint, useAuth()));
}

export function useTokenTraders(mint: string) {
  return useInfiniteQuery(tokenQueries.traders(mint));
}

export function useTokenHolders(mint: string, filters: HolderFilters) {
  return useQuery(tokenQueries.holders(mint, filters, useAuth()));
}
