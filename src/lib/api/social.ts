import { type InfiniteData, infiniteQueryOptions } from "@tanstack/react-query";
import type { AuthState } from "@/components/auth/auth-context";
import {
  ApiError,
  api,
  type CommentPage,
  type FeedItem,
  type FeedPage,
  type FeedScope,
  type LeaderboardEntry,
  type ThesisThread,
  unwrap,
} from "./client";

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

export function tokenCommentsQuery(mint: string, auth?: SocialAuth) {
  return infiniteQueryOptions({
    queryKey: ["tokens", mint, "comments", socialViewer(auth)],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) =>
      unwrap(
        await api.GET("/v1/tokens/{mint}/comments", {
          params: { path: { mint }, query: { cursor: pageParam, limit: 25 } },
          headers: await socialHeaders(auth),
          signal,
        }),
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

export function thesisThreadQuery(mint: string, thesisId: string | null, auth?: SocialAuth) {
  return infiniteQueryOptions({
    queryKey: ["thesis-thread", mint, thesisId, socialViewer(auth)],
    initialPageParam: undefined as string | undefined,
    enabled: Boolean(thesisId),
    queryFn: async ({ pageParam, signal }) => {
      if (!thesisId) throw new ApiError("Missing thesis id", 400);
      return unwrap(
        await api.GET("/v1/tokens/{mint}/theses/{thesisId}", {
          params: { path: { mint, thesisId }, query: { cursor: pageParam, limit: 25 } },
          headers: await socialHeaders(auth),
          signal,
        }),
      );
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

export function feedItemContent(item: FeedItem) {
  return item.kind === "thesis"
    ? {
        label: "Thesis",
        body: item.body,
        attachment: "Thesis · no trade attached",
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

function applyLike<T extends { id: string; likes: number; likedByMe?: boolean }>(
  post: T,
  postId: string,
  liked: boolean,
): T {
  if (post.id !== postId) return post;
  const wasLiked = Boolean(post.likedByMe);
  if (wasLiked === liked) return post;
  return {
    ...post,
    likedByMe: liked,
    likes: Math.max(0, post.likes + (liked ? 1 : -1)),
  };
}

export function updateFeedReaction(
  data: InfiniteData<FeedPage> | undefined,
  postId: string,
  liked: boolean,
): InfiniteData<FeedPage> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) => (item.kind === "thesis" ? applyLike(item, postId, liked) : item)),
    })),
  };
}

export function updateCommentsReaction(
  data: InfiniteData<CommentPage> | undefined,
  postId: string,
  liked: boolean,
): InfiniteData<CommentPage> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      comments: page.comments.map((comment) => applyLike(comment, postId, liked)),
    })),
  };
}

export function updateThreadReaction(
  data: InfiniteData<ThesisThread> | undefined,
  postId: string,
  liked: boolean,
): InfiniteData<ThesisThread> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      pinned: page.pinned ? applyLike(page.pinned, postId, liked) : page.pinned,
      comments: page.comments.map((comment) => applyLike(comment, postId, liked)),
    })),
  };
}
