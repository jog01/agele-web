import { AssetAvatar } from "@/components/common/asset-avatar";
import { TokenAssetAvatar } from "@/components/common/token-asset-avatar";
import { PositionReplayLink } from "@/components/social/position-replay-link";
import type { components } from "@/lib/api/schema";
import { changeTone, formatPct, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

type TopTrade = components["schemas"]["TraderProfile"]["topTrades"][number];

export function TraderTopTrades({ wallet, trades }: { wallet: string; trades: TopTrade[] }) {
  if (!trades.length) return null;
  return (
    <section aria-label="Top trades by realized PnL">
      <h2 className="mb-2 text-muted-foreground text-xs">Best closed trades</h2>
      <ol className="flex snap-x gap-2 overflow-x-auto pb-1">
        {trades.map((trade, index) => (
          <li key={trade.positionId} className="min-w-40 flex-1 snap-start">
            <PositionReplayLink
              target={{ wallet, mint: trade.mint, positionId: trade.positionId }}
              className="block w-full rounded-md bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent/50 focus-visible:outline-2 focus-visible:outline-ring"
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
            </PositionReplayLink>
          </li>
        ))}
      </ol>
    </section>
  );
}
