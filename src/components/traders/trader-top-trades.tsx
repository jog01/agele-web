import Link from "next/link";
import { AssetAvatar } from "@/components/common/asset-avatar";
import { TokenAssetAvatar } from "@/components/common/token-asset-avatar";
import type { components } from "@/lib/api/schema";
import { changeTone, formatPct, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

type TopTrade = components["schemas"]["TraderProfile"]["topTrades"][number];

export function TraderTopTrades({ trades }: { trades: TopTrade[] }) {
  if (!trades.length) return null;
  return (
    <section aria-label="Top trades by realized PnL">
      <ol className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
        {trades.map((trade, index) => (
          <li key={trade.positionId} className="min-w-36 snap-start sm:min-w-0">
            <Link
              href={`/trade/${encodeURIComponent(trade.mint)}`}
              className="block rounded-md border bg-card px-3 py-2.5 transition-colors hover:bg-accent/50 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span className="text-[11px] text-muted-foreground">#{index + 1} Trade</span>
              <span className="mt-1 flex min-w-0 items-center gap-1.5">
                {trade.imageUrl ? (
                  <AssetAvatar imageUrl={trade.imageUrl} className="size-4 shrink-0" />
                ) : (
                  <TokenAssetAvatar mint={trade.mint} className="size-4 shrink-0" />
                )}
                <span
                  className={cn("tabular truncate font-medium text-sm", changeTone(trade.realizedPnlUsd))}
                >
                  {trade.realizedPnlUsd > 0 ? "+" : ""}
                  {formatUsd(trade.realizedPnlUsd)}
                </span>
              </span>
              <span className="tabular mt-0.5 block truncate text-muted-foreground text-xs">
                {trade.symbol} · {formatPct(trade.realizedPnlPct)}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
