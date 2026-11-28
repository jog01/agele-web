"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/auth-context";
import { notificationsApi } from "@/lib/api/notifications";

const REFRESH_MS = 30_000;

export function useNotifications(open: boolean) {
  const auth = useAuth();
  const client = useQueryClient();
  const access = auth.authenticated ? { getAccessToken: auth.getAccessToken } : null;
  const viewer = auth.authenticated
    ? (auth.walletAddress ?? auth.userLabel)
    : !auth.configured
      ? "demo"
      : null;
  const enabled = auth.ready && viewer !== null;
  const listKey = ["notifications", viewer, "list"] as const;
  const countKey = ["notifications", viewer, "unread-count"] as const;

  const count = useQuery({
    queryKey: countKey,
    queryFn: ({ signal }) => notificationsApi.unreadCount(access, signal),
    enabled,
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true,
  });
  const list = useInfiniteQuery({
    queryKey: listKey,
    queryFn: ({ pageParam, signal }) => notificationsApi.list(access, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: ({ nextCursor }) => nextCursor ?? undefined,
    enabled: enabled && open,
    refetchInterval: open ? REFRESH_MS : false,
    refetchOnWindowFocus: true,
  });
  const markRead = useMutation({
    scope: { id: JSON.stringify(listKey) },
    mutationFn: (id: string | null) => notificationsApi.markRead(access, id),
    async onSuccess(result) {
      await client.cancelQueries({ queryKey: countKey });
      client.setQueryData(countKey, result);
      await Promise.all([
        client.invalidateQueries({ queryKey: listKey }),
        client.invalidateQueries({ queryKey: countKey }),
      ]);
    },
  });

  return { auth, enabled, count, list, markRead };
}
