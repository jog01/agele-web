import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type { AuthState } from "@/components/auth/auth-context";
import { ApiError, api, unwrap } from "./client";
import { leaderboardDataSource } from "./leaderboard";
import { socialHeaders, socialViewer } from "./social";

type TraderAuth = Pick<
  AuthState,
  "ready" | "authenticated" | "walletAddress" | "userLabel" | "getAccessToken"
>;

function retry(count: number, error: Error) {
  return count < 1 && !(error instanceof ApiError && error.status >= 400 && error.status < 500);
}

export function traderProfileQuery(wallet: string, auth: TraderAuth) {
  return queryOptions({
    queryKey: ["trader", socialViewer(auth), wallet],
    enabled: auth.ready,
    retry,
    queryFn: async ({ signal }) => {
      const result = await api.GET("/v1/traders/{wallet}", {
        params: { path: { wallet } },
        headers: await socialHeaders(auth),
        signal,
      });
      return { ...unwrap(result), dataSource: leaderboardDataSource(result.response.headers) };
    },
  });
}

export function traderTradesQuery(wallet: string, auth: TraderAuth) {
  return infiniteQueryOptions({
    queryKey: ["trader-trades", wallet, socialViewer(auth)],
    enabled: auth.ready,
    initialPageParam: undefined as string | undefined,
    retry,
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.GET("/v1/traders/{wallet}/trades", {
        params: { path: { wallet }, query: { limit: 25, cursor: pageParam } },
        headers: await socialHeaders(auth),
        signal,
      });
      return { ...unwrap(result), dataSource: leaderboardDataSource(result.response.headers) };
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}
