"use client";

import { type InfiniteData, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/auth-context";
import {
  ApiError,
  api,
  type CommentPage,
  type FeedPage,
  type PostPosition,
  type ThesisThread,
  unwrap,
} from "@/lib/api/client";
import {
  socialHeaders,
  socialViewer,
  updateCommentsReaction,
  updateFeedReaction,
  updateThreadReaction,
} from "@/lib/api/social";

export function usePostThesis() {
  const auth = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      mint,
      body,
      position = "none",
      positionId,
    }: {
      mint: string;
      body: string;
      position?: PostPosition;
      positionId?: string;
    }) => {
      if (!auth.authenticated) throw new ApiError("Sign in to post a thesis", 401);
      return unwrap(
        await api.POST("/v1/tokens/{mint}/theses", {
          params: { path: { mint } },
          headers: await socialHeaders(auth),
          body: { body, position, ...(positionId ? { positionId } : {}) },
        }),
      );
    },
    onSettled: async (_data, _error, { mint }) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["tokens", mint, "comments"] }),
        qc.invalidateQueries({ queryKey: ["position-thesis", mint] }),
        qc.invalidateQueries({ queryKey: ["thesis-thread", mint] }),
        qc.invalidateQueries({ queryKey: ["feed"] }),
      ]);
    },
  });
}

export function usePostComment() {
  const auth = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      mint,
      body,
      position = "none",
      parentId,
    }: {
      mint: string;
      body: string;
      position?: PostPosition;
      parentId?: string;
    }) => {
      if (!auth.authenticated) throw new ApiError("Sign in to post a comment", 401);
      return unwrap(
        await api.POST("/v1/tokens/{mint}/comments", {
          params: { path: { mint } },
          headers: await socialHeaders(auth),
          body: { body, position, ...(parentId ? { parentId } : {}) },
        }),
      );
    },
    onSettled: async (_data, _error, { mint }) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["tokens", mint, "comments"] }),
        qc.invalidateQueries({ queryKey: ["thesis-thread", mint] }),
        qc.invalidateQueries({ queryKey: ["feed"] }),
      ]);
    },
  });
}

export function useReactToPost() {
  const auth = useAuth();
  const qc = useQueryClient();
  const viewer = socialViewer(auth);
  return useMutation({
    mutationFn: async ({ id, liked }: { id: string; liked: boolean; mint?: string }) => {
      if (!auth.authenticated) throw new ApiError("Sign in to like posts", 401);
      const options = { params: { path: { id } }, headers: await socialHeaders(auth) };
      const result = liked
        ? await api.PUT("/v1/posts/{id}/reaction", options)
        : await api.DELETE("/v1/posts/{id}/reaction", options);
      if (!result.response.ok)
        throw new ApiError(
          result.error?.error.message ?? "Could not update reaction",
          result.response.status,
        );
    },
    onMutate: async ({ id, liked, mint }) => {
      const feedFilter = {
        queryKey: ["feed", viewer],
      };
      const commentFilter = mint
        ? { queryKey: ["tokens", mint, "comments", viewer] }
        : {
            queryKey: ["tokens"],
            predicate: (query: { queryKey: readonly unknown[] }) =>
              query.queryKey[2] === "comments" && query.queryKey[3] === viewer,
          };
      const threadFilter = mint
        ? {
            queryKey: ["thesis-thread", mint],
            predicate: (query: { queryKey: readonly unknown[] }) => query.queryKey[3] === viewer,
          }
        : {
            queryKey: ["thesis-thread"],
            predicate: (query: { queryKey: readonly unknown[] }) => query.queryKey[3] === viewer,
          };

      await Promise.all([
        qc.cancelQueries(feedFilter),
        qc.cancelQueries(commentFilter),
        qc.cancelQueries(threadFilter),
      ]);

      const prevFeed = qc.getQueriesData<InfiniteData<FeedPage>>(feedFilter);
      const prevComments = qc.getQueriesData<InfiniteData<CommentPage>>(commentFilter);
      const prevThreads = qc.getQueriesData<InfiniteData<ThesisThread>>(threadFilter);

      if (auth.authenticated) {
        qc.setQueriesData<InfiniteData<FeedPage>>(feedFilter, (data) => updateFeedReaction(data, id, liked));
        qc.setQueriesData<InfiniteData<CommentPage>>(commentFilter, (data) =>
          updateCommentsReaction(data, id, liked),
        );
        qc.setQueriesData<InfiniteData<ThesisThread>>(threadFilter, (data) =>
          updateThreadReaction(data, id, liked),
        );
      }
      return { prevFeed, prevComments, prevThreads };
    },
    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.prevFeed ?? []) qc.setQueryData(key, data);
      for (const [key, data] of context?.prevComments ?? []) qc.setQueryData(key, data);
      for (const [key, data] of context?.prevThreads ?? []) qc.setQueryData(key, data);
    },
    onSettled: async (_data, _error, { mint }) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["feed", viewer] }),
        ...(mint
          ? [
              qc.invalidateQueries({ queryKey: ["tokens", mint, "comments", viewer] }),
              qc.invalidateQueries({ queryKey: ["thesis-thread", mint] }),
            ]
          : []),
      ]);
    },
  });
}

export function usePinThesisVersion() {
  const auth = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean; mint: string }) => {
      if (!auth.authenticated) throw new ApiError("Sign in to pin a thesis", 401);
      const options = { params: { path: { id } }, headers: await socialHeaders(auth) };
      const result = pinned
        ? await api.PUT("/v1/posts/{id}/pin", options)
        : await api.DELETE("/v1/posts/{id}/pin", options);
      if (!result.response.ok)
        throw new ApiError(result.error?.error.message ?? "Could not update pin", result.response.status);
    },
    onSettled: async (_data, _error, { mint }) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["thesis-thread", mint] }),
        qc.invalidateQueries({ queryKey: ["tokens", mint, "comments"] }),
        qc.invalidateQueries({ queryKey: ["feed"] }),
      ]);
    },
  });
}
