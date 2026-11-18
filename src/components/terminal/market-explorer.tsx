"use client";

import {
  ArrowDownWideNarrow,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Star,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AssetAvatar } from "@/components/common/asset-avatar";
import { ChangeText } from "@/components/common/change-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Token } from "@/lib/api/client";
import { useTrending } from "@/lib/api/queries";
import { formatCompactUsd, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTerminalStore } from "@/stores/terminal";

export function MarketExplorer({
  activeMint,
  collapsed = false,
  onToggle,
}: {
  activeMint: string;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const markets = useTrending();
  const { watchlist, toggleWatch } = useTerminalStore();
  const [sort, setSort] = useState("trending");
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // The shell ticker can populate this cache before the streamed terminal hydrates.
  const tokens = mounted ? markets.data : undefined;
  const isPending = !mounted || markets.isPending;
  const isError = mounted && markets.isError;
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = (tokens ?? []).filter(
      (t) =>
        !q ||
        t.symbol.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.mint.toLowerCase() === q,
    );
    return sort === "holders" ? [...filtered].sort((a, b) => b.holders - a.holders) : filtered;
  }, [tokens, sort, query]);
  const watched = mounted ? (tokens ?? []).filter((t) => watchlist.includes(t.mint)) : [];
  const row = (token: Token, compact = false) => {
    const active = token.mint === activeMint;
    const isWatched = mounted && watchlist.includes(token.mint);
    return (
      <li
        key={token.mint}
        className={cn(
          "mx-2 flex items-center rounded-md border-l-2 border-transparent",
          active && "border-primary bg-accent",
        )}
      >
        <Link
          href={`/trade/${token.mint}`}
          aria-current={active ? "page" : undefined}
          aria-label={collapsed ? token.symbol : undefined}
          title={`${token.symbol} · ${token.name}`}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2.5 rounded-md transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-foreground",
            collapsed ? "h-12 justify-center" : "min-h-16 py-3 pl-2",
          )}
        >
          <AssetAvatar mint={token.mint} symbol={token.symbol} className={compact ? "size-7" : "size-8"} />
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-sm">{token.symbol}</span>
                <span className="mt-1 block truncate text-muted-foreground text-xs">
                  {formatCompactUsd(token.marketCapUsd)} MC
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end text-right">
                <span className="tabular block text-xs">{formatPrice(token.priceUsd)}</span>
                <ChangeText value={token.priceChange24hPct} className="mt-1 whitespace-nowrap text-xs" />
              </span>
            </>
          )}
        </Link>
        {!collapsed && (
          <button
            type="button"
            aria-label={
              isWatched ? `Remove ${token.symbol} from watchlist` : `Add ${token.symbol} to watchlist`
            }
            aria-pressed={isWatched}
            onClick={() => toggleWatch(token.mint)}
            className="flex h-16 w-10 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground"
          >
            <Star className={cn("size-3.5", isWatched && "fill-warning text-warning")} aria-hidden />
          </button>
        )}
      </li>
    );
  };
  return (
    <section aria-label="Markets" className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card">
      <div
        className={cn(
          "flex h-16 shrink-0 items-center",
          collapsed ? "justify-center" : "justify-between pl-4 pr-2",
        )}
      >
        {!collapsed && <h2 className="font-semibold text-base tracking-tight">Markets</h2>}
        <Button
          variant="ghost"
          size="icon"
          className="size-10"
          onClick={onToggle}
          aria-label={collapsed ? "Expand markets" : "Collapse markets"}
          aria-expanded={!collapsed}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>
      </div>
      {!collapsed && (
        <div className="space-y-3 px-4 pb-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-3 left-2.5 size-4 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter tokens"
              aria-label="Filter markets"
              autoComplete="off"
              spellCheck={false}
              className="h-11 bg-background/50 pl-8 text-base pointer-fine:text-sm"
            />
          </div>
          <fieldset
            className="grid grid-cols-2 gap-1 rounded-lg bg-background p-1"
            aria-label="Market ranking"
          >
            <Button
              variant={sort === "trending" ? "secondary" : "ghost"}
              className="h-10 px-1 text-xs"
              aria-pressed={sort === "trending"}
              onClick={() => setSort("trending")}
            >
              <TrendingUp className="size-3" /> Trending
            </Button>
            <Button
              variant={sort === "holders" ? "secondary" : "ghost"}
              className="h-10 px-1 text-xs"
              aria-pressed={sort === "holders"}
              onClick={() => setSort("holders")}
            >
              <ArrowDownWideNarrow className="size-3" /> Most held
            </Button>
          </fieldset>
          <div className="flex justify-between pt-1 text-xs text-muted-foreground">
            <span>Asset</span>
            <span>Price · 24h</span>
          </div>
        </div>
      )}
      <div className="min-h-0 overflow-auto overscroll-contain">
        <ul aria-label="Supported markets">
          {isPending &&
            Array.from({ length: 8 }, (_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
              <li key={i} className="flex h-16 items-center gap-2 px-3">
                <Skeleton className="size-7 shrink-0 rounded-full" />
                {!collapsed && <Skeleton className="h-5 flex-1" />}
              </li>
            ))}
          {isError && (
            <li className="px-3 py-4 text-muted-foreground text-xs">
              Markets unavailable.
              <Button variant="link" onClick={() => markets.refetch()}>
                Retry
              </Button>
            </li>
          )}
          {!isPending && !isError && rows.length === 0 && (
            <li className="px-3 py-5 text-muted-foreground text-xs">
              No matching tokens. Try a symbol or mint.
            </li>
          )}
          {rows.map((t) => row(t))}
        </ul>
        {!collapsed && (
          <details aria-label="Watchlist" className="group mt-3 border-t border-border/60">
            <summary className="flex min-h-12 cursor-pointer items-center gap-2 rounded-md px-4 font-medium text-sm transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-foreground">
              <Star className="size-3 text-warning" aria-hidden /> Watchlist{" "}
              <span className="tabular ml-auto text-muted-foreground">{watched.length}</span>
              <ChevronDown
                className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            {!mounted ? (
              <Skeleton className="mx-3 mb-3 h-16" />
            ) : watched.length ? (
              <ul>{watched.map((t) => row(t, true))}</ul>
            ) : (
              <p className="px-4 pb-4 text-muted-foreground text-sm">Star a token to keep it close.</p>
            )}
          </details>
        )}
      </div>
    </section>
  );
}
