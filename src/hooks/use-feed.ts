"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/auth-context";
import type { FeedScope } from "@/lib/api/client";
import { feedQuery } from "@/lib/api/social";

export function useFeed(scope: FeedScope) {
  const auth = useAuth();
  return useInfiniteQuery(feedQuery(scope, auth));
}
