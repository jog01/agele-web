"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/auth-context";
import type { PortfolioRange } from "@/lib/api/client";
import { portfolioQueries } from "@/lib/api/portfolio";

export function usePortfolio() {
  return useQuery(portfolioQueries.summary(useAuth()));
}

export function usePortfolioHistory(range: PortfolioRange) {
  return useQuery(portfolioQueries.history(range, useAuth()));
}

export function useUserTrades() {
  return useInfiniteQuery(portfolioQueries.trades(useAuth()));
}
