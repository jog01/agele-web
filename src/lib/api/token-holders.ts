import { api, unwrap } from "./client";
import type { components } from "./schema";
import { type SocialAuth, socialHeaders } from "./social";

export interface HolderFilters {
  thesisOnly?: boolean;
  followingOnly?: boolean;
  minValueUsd?: number;
}

type HolderSnapshot = components["schemas"]["TokenHolders"];

export type TokenHolder = HolderSnapshot["holders"][number] & {
  trader?: {
    wallet: string;
    handle: string;
    displayName: string | null;
    avatarUrl: string | null;
    verified: boolean;
  } | null;
  isFollowed?: boolean;
  position?: {
    avgEntryMarketCapUsd: number | null;
    investedUsd: number | null;
    pnlUsd: number | null;
    pnlPct: number | null;
    firstBoughtAt: number | null;
  } | null;
  latestThesis?: {
    thesisId: string;
    body: string;
    createdAt: number;
    likeCount: number;
    replyCount: number;
  } | null;
};

type TokenHolders = HolderSnapshot & { holders: TokenHolder[] };

export async function fetchTokenHolders(
  mint: string,
  filters: HolderFilters,
  auth: SocialAuth | undefined,
  signal: AbortSignal,
): Promise<TokenHolders> {
  const query = { limit: 20, ...filters };
  return unwrap(
    await api.GET("/v1/tokens/{mint}/holders", {
      params: { path: { mint }, query },
      ...(filters.followingOnly && { headers: await socialHeaders(auth) }),
      signal,
    }),
  );
}
