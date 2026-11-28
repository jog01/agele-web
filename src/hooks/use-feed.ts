"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/auth-context";
import type { FeedScope } from "@/lib/api/client";
import { feedQuery } from "@/lib/api/social";
import type { FeedFilters } from "@/lib/feed-filters";

export function useFeed(scope: FeedScope, filters?: FeedFilters, ready?: boolean) {
  const auth = useAuth();
  return useInfiniteQuery(feedQuery(scope, auth, filters, ready));
}
