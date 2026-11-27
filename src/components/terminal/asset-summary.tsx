"use client";

import { ExternalLink } from "lucide-react";
import { AssetAvatar } from "@/components/common/asset-avatar";
import { ChangeText } from "@/components/common/change-text";
import { CopyAddress } from "@/components/common/copy-address";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Token } from "@/lib/api/client";
import { formatCompact, formatCompactUsd, formatPrice } from "@/lib/format";

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0 px-3 py-2" title={note}>
      <dt className="whitespace-nowrap text-muted-foreground text-[10px]">{label}</dt>
      <dd className="tabular mt-0.5 truncate font-medium text-xs">{value}</dd>
    </div>
  );
}

export function AssetSummary({ token, livePrice }: { token: Token | undefined; livePrice: number | null }) {
  if (!token)
    return (
      <div
        role="status"
        aria-label="Loading market summary"
        className="flex min-h-[66px] shrink-0 items-center gap-3 rounded-md border bg-card px-3"
      >
        <span className="sr-only">Loading market summary</span>
        <Skeleton className="size-8 rounded-full motion-reduce:animate-none" />
        <Skeleton className="h-7 w-32 motion-reduce:animate-none" />
        <Skeleton className="ml-auto h-7 w-1/2 motion-reduce:animate-none" />
      </div>
    );
  const price = livePrice ?? token.priceUsd;
  return (
    <section
      aria-label={`${token.symbol} summary`}
      className="flex shrink-0 flex-col overflow-hidden rounded-md border bg-card xl:flex-row xl:items-center"
    >
      <div className="flex min-h-[62px] min-w-0 items-center gap-2 px-3 py-1 xl:flex-1">
        <AssetAvatar imageUrl={token.imageUrl} className="size-8" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-sm">{token.symbol}</h1>
            <span className="truncate text-muted-foreground text-xs">{token.name}</span>
            <Badge variant="secondary" className="hidden h-4 shrink-0 px-1 text-[9px] 2xl:inline-flex">
              Solana
            </Badge>
          </div>
          <div className="flex h-6 items-center gap-1 [&_button]:size-6 pointer-coarse:[&_button]:size-8">
            <CopyAddress address={token.mint} label="Copy contract address" />
            <a
              href={`https://solscan.io/token/${token.mint}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`View ${token.symbol} on Solscan`}
              className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground pointer-coarse:size-8"
            >
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="tabular font-semibold text-sm leading-5 tracking-tight">{formatPrice(price)}</div>
          <ChangeText value={token.priceChange24hPct} className="text-xs" />
          <span className="ml-1 text-muted-foreground text-[10px]">24h</span>
        </div>
      </div>
      <dl className="grid grid-cols-4 divide-x divide-border/60 border-t border-border/60 xl:shrink-0 xl:border-t-0 xl:border-l">
        <Stat label="Market cap" value={formatCompactUsd(token.marketCapUsd)} />
        <Stat label="24h volume" value={formatCompactUsd(token.volume24hUsd)} />
        <Stat label="Liquidity" value={formatCompactUsd(token.liquidityUsd)} />
        <Stat label="Holders" value={formatCompact(token.holders)} />
      </dl>
    </section>
  );
}
