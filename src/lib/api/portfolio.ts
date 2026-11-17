import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type { AuthState } from "@/components/auth/auth-context";
import { ApiError, api, type PortfolioRange, unwrap } from "./client";

type PortfolioAuth = Pick<AuthState, "authenticated" | "walletAddress" | "userLabel" | "getAccessToken">;

export function portfolioViewer(auth: PortfolioAuth) {
  return auth.authenticated ? (auth.walletAddress ?? auth.userLabel) : null;
}

async function portfolioHeaders(auth: PortfolioAuth) {
  if (!auth.authenticated || !portfolioViewer(auth))
    throw new ApiError("Sign in to view your portfolio", 401);
  const token = await auth.getAccessToken();
  if (!token) throw new ApiError("Sign in again to view your portfolio", 401);
  return { Authorization: `Bearer ${token}` };
}

export const portfolioQueries = {
  summary: (auth: PortfolioAuth) =>
    queryOptions({
      queryKey: ["portfolio", portfolioViewer(auth), "summary"],
      enabled: auth.authenticated && !!portfolioViewer(auth),
      queryFn: async ({ signal }) =>
        unwrap(await api.GET("/v1/me/portfolio", { headers: await portfolioHeaders(auth), signal })),
      refetchInterval: 30_000,
    }),
  history: (range: PortfolioRange, auth: PortfolioAuth) =>
    queryOptions({
      queryKey: ["portfolio", portfolioViewer(auth), "history", range],
      enabled: auth.authenticated && !!portfolioViewer(auth),
      queryFn: async ({ signal }) =>
        unwrap(
          await api.GET("/v1/me/portfolio/history", {
            params: { query: { range } },
            headers: await portfolioHeaders(auth),
            signal,
          }),
        ),
      refetchInterval: 30_000,
    }),
  trades: (auth: PortfolioAuth) =>
    infiniteQueryOptions({
      queryKey: ["portfolio", portfolioViewer(auth), "trades"],
      enabled: auth.authenticated && !!portfolioViewer(auth),
      initialPageParam: undefined as string | undefined,
      queryFn: async ({ pageParam, signal }) =>
        unwrap(
          await api.GET("/v1/me/trades", {
            params: { query: { limit: 25, cursor: pageParam } },
            headers: await portfolioHeaders(auth),
            signal,
          }),
        ),
      getNextPageParam: (page) => page.nextCursor ?? undefined,
      refetchInterval: 30_000,
    }),
};
