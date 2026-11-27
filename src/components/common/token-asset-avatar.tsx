"use client";

import { useQuery } from "@tanstack/react-query";
import { tokenQueries } from "@/lib/api/queries";
import { AssetAvatar } from "./asset-avatar";

export function TokenAssetAvatar({ mint, className }: { mint: string; className?: string }) {
  const { data: trendingImage } = useQuery({
    ...tokenQueries.trending(),
    enabled: false,
    select: (tokens) => tokens.find((token) => token.mint === mint)?.imageUrl ?? null,
  });
  const { data: token } = useQuery({
    ...tokenQueries.detail(mint),
    enabled: !trendingImage,
    refetchInterval: false,
    retry: false,
    staleTime: 60_000,
  });
  return <AssetAvatar imageUrl={token?.imageUrl ?? trendingImage} className={className} />;
}
