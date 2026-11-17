"use client";

import { infiniteQueryOptions, queryOptions, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/auth-context";
import { useLiveLeaderboard } from "@/hooks/use-live-leaderboard";
import { useLivePrices } from "@/hooks/use-live-prices";
import { ApiError, api, type Interval, type LeaderboardWindow, type Me, unwrap } from "./client";
import { leaderboardDataSource } from "./leaderboard";
import { portfolioViewer } from "./portfolio";
import { type SocialAuth, socialHeaders, socialViewer } from "./social";

export const tokenQueries = {
  holders: (mint: string) =>
    queryOptions({
      queryKey: ["tokens", mint, "holders"],
      queryFn: async ({ signal }) =>
        unwrap(
          await api.GET("/v1/tokens/{mint}/holders", {
            params: { path: { mint }, query: { limit: 20 } },
            signal,
          }),
        ),
      retry: false,
      staleTime: 30_000,
    }),
  position: (mint: string, auth: SocialAuth) =>
    queryOptions({
      queryKey: ["tokens", mint, "position", portfolioViewer(auth)],
      enabled: auth.authenticated && !!portfolioViewer(auth),
      queryFn: async ({ signal }) => {
        if (!auth.authenticated || !portfolioViewer(auth))
          throw new ApiError("Sign in to view your position", 401);
        const result = await api.GET("/v1/tokens/{mint}/positions", {
          params: { path: { mint } },
          headers: await socialHeaders(auth),
          signal,
        });
        return { ...unwrap(result), dataSource: leaderboardDataSource(result.response.headers) };
      },
      retry: (count, error) => !(error instanceof ApiError && [401, 404].includes(error.status)) && count < 2,
      refetchInterval: 30_000,
    }),
  traders: (mint: string) =>
    infiniteQueryOptions({
      queryKey: ["tokens", mint, "traders"],
      initialPageParam: undefined as string | undefined,
      queryFn: async ({ pageParam, signal }) => {
        const result = await api.GET("/v1/tokens/{mint}/traders", {
          params: { path: { mint }, query: { limit: 25, cursor: pageParam } },
          signal,
        });
        return { ...unwrap(result), dataSource: leaderboardDataSource(result.response.headers) };
      },
      getNextPageParam: (page) => page.nextCursor ?? undefined,
      retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
    }),
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
  leaderboard: (window: LeaderboardWindow, auth?: SocialAuth) =>
    queryOptions({
      queryKey: ["leaderboard", window, socialViewer(auth)],
      queryFn: async ({ signal }) => {
        const result = await api.GET("/v1/leaderboard", {
          params: { query: { window, limit: 25 } },
          headers: await socialHeaders(auth),
          signal,
        });
        return { ...unwrap(result), dataSource: leaderboardDataSource(result.response.headers) };
      },
      refetchInterval: 30_000,
    }),
};

export const userQueries = {
  /** `null` when the API has no Privy config (503 `auth_not_configured`): treated as demo mode. */
  me: () =>
    queryOptions({
      queryKey: ["me"],
      queryFn: async ({ signal }): Promise<Me | null> => {
        try {
          return unwrap(await api.GET("/v1/me", { signal }));
        } catch (err) {
          if (err instanceof ApiError && err.status === 503) return null;
          throw err;
        }
      },
      staleTime: 60_000,
      retry: (count, err) => !(err instanceof ApiError && err.status === 401) && count < 2,
    }),
};

export function useTrending() {
  const query = useQuery(tokenQueries.trending());
  useLivePrices(query.data?.map((token) => token.mint) ?? []);
  return query;
}

export function useToken(mint: string) {
  useLivePrices([mint]);
  return useQuery(tokenQueries.detail(mint));
}

export function useLeaderboard(window: LeaderboardWindow) {
  const auth = useAuth();
  useLiveLeaderboard();
  return useQuery(socialQueries.leaderboard(window, auth));
}
