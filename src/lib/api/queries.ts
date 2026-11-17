"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { api, type Interval, type LeaderboardWindow, unwrap } from "./client";

export const tokenQueries = {
  trending: () =>
    queryOptions({
      queryKey: ["tokens", "trending"],
      queryFn: async ({ signal }) =>
        unwrap(await api.GET("/v1/tokens/trending", { params: { query: { limit: 50 } }, signal })).tokens,
      refetchInterval: 15_000,
    }),
  detail: (mint: string) =>
    queryOptions({
      queryKey: ["tokens", mint],
      queryFn: async ({ signal }) =>
        unwrap(await api.GET("/v1/tokens/{mint}", { params: { path: { mint } }, signal })),
      refetchInterval: 15_000,
    }),
  candles: (mint: string, interval: Interval) =>
    queryOptions({
      queryKey: ["tokens", mint, "candles", interval],
      queryFn: async ({ signal }) =>
        unwrap(
          await api.GET("/v1/tokens/{mint}/candles", {
            params: { path: { mint }, query: { interval, limit: 300 } },
            signal,
          }),
        ).candles,
      staleTime: 60_000,
    }),
  trades: (mint: string) =>
    queryOptions({
      queryKey: ["tokens", mint, "trades"],
      queryFn: async ({ signal }) =>
        unwrap(
          await api.GET("/v1/tokens/{mint}/trades", {
            params: { path: { mint }, query: { limit: 40 } },
            signal,
          }),
        ).trades,
      staleTime: Number.POSITIVE_INFINITY,
    }),
  comments: (mint: string) =>
    queryOptions({
      queryKey: ["tokens", mint, "comments"],
      queryFn: async ({ signal }) =>
        unwrap(
          await api.GET("/v1/tokens/{mint}/comments", {
            params: { path: { mint }, query: { limit: 20 } },
            signal,
          }),
        ).comments,
    }),
};

export const socialQueries = {
  leaderboard: (window: LeaderboardWindow) =>
    queryOptions({
      queryKey: ["leaderboard", window],
      queryFn: async ({ signal }) =>
        unwrap(await api.GET("/v1/leaderboard", { params: { query: { window, limit: 25 } }, signal })),
      refetchInterval: 30_000,
    }),
};

export const useTrending = () => useQuery(tokenQueries.trending());
export const useToken = (mint: string) => useQuery(tokenQueries.detail(mint));
