"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/auth-context";
import { ApiError, api, type LeaderboardPage } from "@/lib/api/client";
import { socialHeaders, socialViewer, updateFollowing } from "@/lib/api/social";

type Board = LeaderboardPage;

export function useFollow() {
  const auth = useAuth();
  const qc = useQueryClient();
  const viewer = socialViewer(auth);
  const boards = {
    queryKey: ["leaderboard"],
    predicate: (query: { queryKey: readonly unknown[] }) => query.queryKey[2] === viewer,
  };
  return useMutation({
    mutationFn: async ({ wallet, isFollowing }: { wallet: string; isFollowing: boolean }) => {
      if (!auth.authenticated) throw new ApiError("Sign in to follow traders", 401);
      const options = { params: { path: { wallet } }, headers: await socialHeaders(auth) };
      const result = isFollowing
        ? await api.PUT("/v1/follows/{wallet}", options)
        : await api.DELETE("/v1/follows/{wallet}", options);
      if (!result.response.ok)
        throw new ApiError(result.error?.error.message ?? "Could not update follow", result.response.status);
    },
    onMutate: async ({ wallet, isFollowing }) => {
      await qc.cancelQueries(boards);
      const previous = qc.getQueriesData<Board>(boards);
      if (auth.authenticated)
        qc.setQueriesData<Board>(boards, (board) => updateFollowing(board, wallet, isFollowing));
      return { previous };
    },
    onError: (_error, { wallet }, context) => {
      for (const [key, previous] of context?.previous ?? []) {
        const entry = previous?.entries.find((entry) => entry.wallet === wallet);
        if (!entry) continue;
        qc.setQueryData<Board>(
          key,
          (current) =>
            current && {
              ...current,
              entries: current.entries.map((currentEntry) =>
                currentEntry.wallet === wallet
                  ? { ...currentEntry, isFollowing: entry.isFollowing }
                  : currentEntry,
              ),
            },
        );
      }
    },
    onSettled: async () => {
      await Promise.all([
        qc.invalidateQueries(boards),
        qc.invalidateQueries({ queryKey: ["feed", viewer, "following"] }),
      ]);
    },
  });
}
