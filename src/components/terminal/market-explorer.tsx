"use client";

import { Search, Star } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AssetAvatar } from "@/components/common/asset-avatar";
import { ChangeText } from "@/components/common/change-text";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTrending } from "@/lib/api/queries";
import { formatCompactUsd, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTerminalStore } from "@/stores/terminal";

export function MarketExplorer({ activeMint }: { activeMint: string }) {
  const { data: tokens, isPending, isError } = useTrending();
  const { watchlist, toggleWatch } = useTerminalStore();
  const [tab, setTab] = useState("supported");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (tokens ?? [])
      .filter((t) => tab === "supported" || watchlist.includes(t.mint))
      .filter((t) => !q || t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q));
  }, [tokens, tab, watchlist, query]);

  return (
    <section aria-label="Markets" className="flex min-h-0 flex-col rounded-lg border bg-card">
      <div className="space-y-2 p-3 pb-2">
        <div className="relative">
          <Search className="absolute top-2 left-2.5 size-4 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter markets"
            aria-label="Filter markets"
            className="h-8 pl-8"
          />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="supported">Supported</TabsTrigger>
            <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <ul className="min-h-0 flex-1 overflow-auto px-1 pb-1">
        {isPending &&
          Array.from({ length: 8 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
            <li key={i} className="flex h-14 items-center gap-3 px-2">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </li>
          ))}
        {isError && <li className="p-4 text-muted-foreground">Markets unavailable. Is the API running?</li>}
        {!isPending && rows.length === 0 && (
          <li className="p-4 text-muted-foreground">
            {tab === "watchlist" ? "Star a market to add it here." : "No markets match."}
          </li>
        )}
        {rows.map((t) => {
          const active = t.mint === activeMint;
          const watched = watchlist.includes(t.mint);
          return (
            <li key={t.mint} className="relative">
              <Link
                href={`/trade/${t.mint}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 items-center gap-3 rounded-md border-l-2 border-transparent px-2 pr-9 transition-colors hover:bg-surface-hover",
                  active && "border-primary bg-surface-hover",
                )}
              >
                <AssetAvatar symbol={t.symbol} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{t.symbol}</span>
                  <span className="block truncate text-muted-foreground text-xs">
                    {formatCompactUsd(t.marketCapUsd)} MC
                  </span>
                </span>
                <span className="text-right">
                  <span className="tabular block">{formatPrice(t.priceUsd)}</span>
                  <ChangeText value={t.priceChange24hPct} className="text-xs" />
                </span>
              </Link>
              <button
                type="button"
                aria-label={watched ? `Remove ${t.symbol} from watchlist` : `Add ${t.symbol} to watchlist`}
                aria-pressed={watched}
                onClick={() => toggleWatch(t.mint)}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <Star className={cn("size-3.5", watched && "fill-warning text-warning")} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
