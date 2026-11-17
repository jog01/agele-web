"use client";

import { ExternalLink } from "lucide-react";
import { AssetAvatar } from "@/components/common/asset-avatar";
import { ChangeText } from "@/components/common/change-text";
import { CopyAddress } from "@/components/common/copy-address";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Token } from "@/lib/api/client";
import { formatCompact, formatCompactUsd, formatPrice } from "@/lib/format";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="tabular truncate font-medium">{value}</div>
    </div>
  );
}

export function AssetSummary({ token, livePrice }: { token: Token | undefined; livePrice: number | null }) {
  if (!token) return <Skeleton className="h-[72px] rounded-lg" />;
  const price = livePrice ?? token.priceUsd;
  return (
    <section
      aria-label={`${token.symbol} summary`}
      className="flex h-[72px] items-center gap-6 rounded-lg border bg-card px-4"
    >
      <div className="flex min-w-0 items-center gap-3">
        <AssetAvatar symbol={token.symbol} className="size-10" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-[15px]">{token.symbol}</h1>
            <span className="truncate text-muted-foreground">{token.name}</span>
            <Badge variant="secondary" className="h-5 text-[11px]">
              Solana
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <CopyAddress address={token.mint} label="Copy contract address" />
            <a
              href={`https://solscan.io/token/${token.mint}`}
              target="_blank"
              rel="noreferrer"
              aria-label="View on explorer"
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      </div>
      <div>
        <div className="tabular font-semibold text-[20px] leading-6">{formatPrice(price)}</div>
        <ChangeText value={token.priceChange24hPct} className="text-xs" />
      </div>
      <div className="ml-auto hidden grid-cols-4 gap-6 lg:grid">
        <Stat label="Market cap" value={formatCompactUsd(token.marketCapUsd)} />
        <Stat label="24h volume" value={formatCompactUsd(token.volume24hUsd)} />
        <Stat label="Liquidity" value={formatCompactUsd(token.liquidityUsd)} />
        <Stat label="Holders" value={formatCompact(token.holders)} />
      </div>
    </section>
  );
}
