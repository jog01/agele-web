"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ChangeText } from "@/components/common/change-text";
import { env } from "@/env";
import { useMarketDataSource } from "@/hooks/use-market-data-source";
import { useNow } from "@/hooks/use-now";
import { tokenQueries } from "@/lib/api/queries";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useRealtimeStore } from "@/stores/realtime";

const LABEL = { connecting: "Connecting", open: "Connected", closed: "Reconnecting" } as const;

export function StatusStrip() {
  const source = useMarketDataSource();
  const { status, lastMessageAt } = useRealtimeStore();
  const now = useNow();
  const { data: tokens = [] } = useQuery(tokenQueries.trending());
  const ago = lastMessageAt && now ? Math.max(0, Math.round((now - lastMessageAt) / 1000)) : null;
  return (
    <footer className="hidden h-10 shrink-0 items-center gap-4 border-t border-border/60 bg-sidebar px-6 text-xs text-muted-foreground lg:flex">
      <span
        className="inline-flex shrink-0 items-center gap-1.5"
        aria-live="polite"
        title={ago === null ? "No updates yet" : `Last update ${ago}s ago`}
      >
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            status === "open" ? "bg-positive" : status === "closed" ? "bg-negative" : "bg-warning",
          )}
        />
        {LABEL[status]}
        {source === "mock" ? " · demo fixtures" : " · live"}
      </span>
      <nav
        className="flex min-w-0 flex-1 items-center gap-5 overflow-x-auto overscroll-contain border-x px-3"
        aria-label="Market ticker"
      >
        {tokens.length ? (
          tokens.map((token) => (
            <Link
              href={`/trade/${token.mint}`}
              key={token.mint}
              className="tabular flex h-7 shrink-0 items-center gap-1.5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground"
            >
              <span className="font-medium text-foreground">{token.symbol}</span>
              <span>{formatPrice(token.priceUsd)}</span>
              <ChangeText value={token.priceChange24hPct} />
            </Link>
          ))
        ) : (
          <span>Waiting for market data</span>
        )}
      </nav>
      <span className="hidden shrink-0 2xl:inline">Solana {env.NEXT_PUBLIC_SOLANA_CLUSTER}</span>
      <a
        href="https://github.com/jog01/agele/blob/main/docs/architecture.md"
        target="_blank"
        rel="noreferrer"
        className="shrink-0 hover:text-foreground"
      >
        Docs
      </a>
      <a
        href="https://www.tradingview.com"
        target="_blank"
        rel="noreferrer"
        className="shrink-0 hover:text-foreground"
      >
        Charts by TradingView
      </a>
    </footer>
  );
}
