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
          "mx-1 flex items-center rounded border-l-2 border-transparent",
          active && "border-primary bg-accent",
        )}
      >
        <Link
          href={`/trade/${token.mint}`}
          aria-current={active ? "page" : undefined}
          aria-label={collapsed ? token.symbol : undefined}
          title={`${token.symbol} · ${token.name}`}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-foreground",
            collapsed ? "h-11 justify-center" : "min-h-11 py-1.5 pl-1.5",
          )}
        >
          <AssetAvatar mint={token.mint} symbol={token.symbol} className={compact ? "size-6" : "size-7"} />
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-xs">{token.symbol}</span>
                <span className="mt-0.5 block truncate text-muted-foreground text-[11px]">
                  {formatCompactUsd(token.marketCapUsd)} MC
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end text-right">
                <span className="tabular block text-xs">{formatPrice(token.priceUsd)}</span>
                <ChangeText
                  value={token.priceChange24hPct}
                  className="mt-0.5 whitespace-nowrap text-[11px]"
                />
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
            className="flex h-11 w-8 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground"
          >
            <Star className={cn("size-3.5", isWatched && "fill-warning text-warning")} aria-hidden />
          </button>
        )}
      </li>
    );
  };
  return (
    <section
      aria-label="Markets"
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border/60 bg-card"
    >
      <div
        className={cn(
          "flex h-9 shrink-0 items-center border-b border-border/60",
          collapsed ? "justify-center" : "justify-between pl-2.5 pr-1",
        )}
      >
        {!collapsed && <h2 className="font-semibold text-xs">Markets</h2>}
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onToggle}
          aria-label={collapsed ? "Expand markets" : "Collapse markets"}
          aria-expanded={!collapsed}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>
      </div>
      {!collapsed && (
        <div className="space-y-2 px-2 py-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-2 left-2 size-3.5 text-muted-foreground"
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
              className="h-8 rounded border-border bg-muted/60 pl-7 text-base pointer-fine:text-xs"
            />
          </div>
          <fieldset className="grid grid-cols-2 gap-1" aria-label="Market ranking">
            <Button
              variant={sort === "trending" ? "secondary" : "ghost"}
              className="h-7 rounded px-1 text-[11px]"
              aria-pressed={sort === "trending"}
              onClick={() => setSort("trending")}
            >
              <TrendingUp className="size-3" /> Trending
            </Button>
            <Button
              variant={sort === "holders" ? "secondary" : "ghost"}
              className="h-7 rounded px-1 text-[11px]"
              aria-pressed={sort === "holders"}
              onClick={() => setSort("holders")}
            >
              <ArrowDownWideNarrow className="size-3" /> Most held
            </Button>
          </fieldset>
          <div className="flex justify-between px-1 pt-1 text-[10px] text-muted-foreground">
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
              <li key={i} className="flex h-11 items-center gap-2 px-3">
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
          <details aria-label="Watchlist" className="group mt-2 border-t border-border/60">
            <summary className="flex min-h-9 cursor-pointer items-center gap-2 rounded px-3 font-medium text-xs transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-foreground">
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
