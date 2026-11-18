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
    <div className="min-w-0 px-4 py-3" title={note}>
      <dt className="whitespace-nowrap text-muted-foreground text-xs">{label}</dt>
      <dd className="tabular mt-0.5 truncate font-medium">{value}</dd>
    </div>
  );
}

export function AssetSummary({ token, livePrice }: { token: Token | undefined; livePrice: number | null }) {
  if (!token) return <Skeleton className="h-[132px] shrink-0 rounded-lg" />;
  const price = livePrice ?? token.priceUsd;
  return (
    <section
      aria-label={`${token.symbol} summary`}
      className="shrink-0 overflow-hidden rounded-lg border bg-card"
    >
      <div className="flex min-h-[88px] items-center gap-3 px-4 py-3">
        <AssetAvatar mint={token.mint} symbol={token.symbol} className="size-10" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-base">{token.symbol}</h1>
            <span className="truncate text-muted-foreground text-xs">{token.name}</span>
            <Badge variant="secondary" className="hidden h-5 shrink-0 text-[10px] sm:inline-flex">
              Solana
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <CopyAddress address={token.mint} label="Copy contract address" />
            <a
              href={`https://solscan.io/token/${token.mint}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`View ${token.symbol} on Solscan`}
              className="flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground"
            >
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="tabular font-semibold text-xl leading-6 tracking-tight">{formatPrice(price)}</div>
          <ChangeText value={token.priceChange24hPct} className="text-xs" />
          <span className="ml-1 text-muted-foreground text-[10px]">24h</span>
        </div>
      </div>
      <dl className="grid grid-cols-2 divide-x divide-border/60 border-t border-border/60 sm:grid-cols-4">
        <Stat label="Market cap" value={formatCompactUsd(token.marketCapUsd)} />
        <Stat label="24h volume" value={formatCompactUsd(token.volume24hUsd)} />
        <Stat label="Liquidity" value={formatCompactUsd(token.liquidityUsd)} />
        <Stat label="Holders" value={formatCompact(token.holders)} />
      </dl>
    </section>
  );
}
