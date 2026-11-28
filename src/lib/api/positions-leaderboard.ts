import { infiniteQueryOptions } from "@tanstack/react-query";
import { api, unwrap } from "./client";
import { leaderboardDataSource } from "./leaderboard";
import type { paths } from "./schema";

type Operation = paths["/v1/leaderboard/positions"]["get"];
type Page = Operation["responses"][200]["content"]["application/json"];
export type RankedPosition = Page["entries"][number];
type Query = NonNullable<Operation["parameters"]["query"]>;
export type PositionsWindow = Page["window"];
export type InvestedBucket = NonNullable<Query["invested"]>;
type PositionsFilters = Omit<Query, "cursor" | "limit">;

export function positionsLeaderboardQuery(filters: PositionsFilters) {
  return infiniteQueryOptions({
    queryKey: ["positions-leaderboard", filters],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) => {
      const result = await api.GET("/v1/leaderboard/positions", {
        params: { query: { ...filters, cursor: pageParam, limit: 10 } },
        signal,
      });
      return { ...unwrap(result), dataSource: leaderboardDataSource(result.response.headers) };
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 30_000,
  });
}
