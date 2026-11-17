import { infiniteQueryOptions } from "@tanstack/react-query";
import type { AuthState } from "@/components/auth/auth-context";
import { ApiError, api, type FeedItem, type FeedScope, type LeaderboardEntry, unwrap } from "./client";

export type SocialAuth = Pick<AuthState, "authenticated" | "walletAddress" | "userLabel" | "getAccessToken">;

export function socialViewer(auth?: SocialAuth) {
  return auth?.authenticated ? (auth.walletAddress ?? auth.userLabel ?? "authenticated") : "anonymous";
}

export async function socialHeaders(auth?: SocialAuth) {
  if (!auth?.authenticated) return undefined;
  const token = await auth.getAccessToken();
  if (!token) throw new ApiError("Sign in again to continue", 401);
  return { Authorization: `Bearer ${token}` };
}

export function feedQuery(scope: FeedScope, auth: SocialAuth) {
  return infiniteQueryOptions({
    queryKey: ["feed", socialViewer(auth), scope],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) =>
      unwrap(
        await api.GET("/v1/feed", {
          params: { query: { scope, cursor: pageParam, limit: 25 } },
          headers: await socialHeaders(auth),
          signal,
        }),
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: scope === "global" || auth.authenticated,
  });
}

export function feedItemContent(item: FeedItem) {
  return item.kind === "thesis"
    ? {
        label: "Thesis",
        body: item.body,
        attachment: "Opinion · no execution attached",
        tone:
          item.position === "long"
            ? "text-positive"
            : item.position === "short"
              ? "text-negative"
              : "text-primary",
      }
    : {
        label: item.side === "buy" ? "Buy" : "Sell",
        tone: item.side === "buy" ? "text-positive" : "text-negative",
        body: null,
        attachment: `${item.side === "buy" ? "Bought" : "Sold"} · $${item.amountUsd.toLocaleString("en-US")}`,
      };
}

export function updateFollowing<T extends { entries: LeaderboardEntry[] }>(
  board: T | undefined,
  wallet: string,
  isFollowing: boolean,
): T | undefined {
  if (!board) return board;
  return {
    ...board,
    entries: board.entries.map((entry) => (entry.wallet === wallet ? { ...entry, isFollowing } : entry)),
  };
}
