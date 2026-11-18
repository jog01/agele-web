"use client";

import { useQuery } from "@tanstack/react-query";
import { Pause, Play } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AssetAvatar } from "@/components/common/asset-avatar";
import { ChangeText } from "@/components/common/change-text";
import { env } from "@/env";
import { useMarketDataSource } from "@/hooks/use-market-data-source";
import { useNow } from "@/hooks/use-now";
import { tokenQueries } from "@/lib/api/queries";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useRealtimeStore } from "@/stores/realtime";
import styles from "./status-strip.module.css";

const LABEL = { connecting: "Connecting", open: "Connected", closed: "Reconnecting" } as const;

export function StatusStrip() {
  const [paused, setPaused] = useState(false);
  const source = useMarketDataSource();
  const { status, lastMessageAt } = useRealtimeStore();
  const now = useNow();
  const { data: tokens = [] } = useQuery(tokenQueries.trending());
  const ago = lastMessageAt && now ? Math.max(0, Math.round((now - lastMessageAt) / 1000)) : null;
  return (
    <footer className="hidden h-7 shrink-0 items-center gap-3 border-t border-border/60 bg-sidebar px-3 text-[11px] text-muted-foreground lg:flex">
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
      <div className="flex min-w-0 flex-1 items-center border-x border-border/60">
        <nav
          className={cn("panel-scrollbars min-w-0 flex-1 overscroll-contain", styles.viewport)}
          aria-label="Market ticker"
          data-paused={paused}
        >
          {tokens.length ? (
            <div
              className={styles.track}
              style={{ animationDuration: `${Math.max(30, tokens.length * 6)}s` }}
            >
              <div className={styles.group}>
                {tokens.map((token) => (
                  <Link
                    href={`/trade/${token.mint}`}
                    key={token.mint}
                    className="tabular flex h-6 shrink-0 items-center gap-1.5 px-1 hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground"
                  >
                    <AssetAvatar mint={token.mint} symbol={token.symbol} className="size-4" />
                    <span className="font-semibold text-foreground">{token.symbol}</span>
                    <span>{formatPrice(token.priceUsd)}</span>
                    <ChangeText value={token.priceChange24hPct} />
                  </Link>
                ))}
              </div>
              <div className={cn(styles.group, styles.copy)} aria-hidden>
                {tokens.map((token) => (
                  <Link
                    href={`/trade/${token.mint}`}
                    key={token.mint}
                    tabIndex={-1}
                    className="tabular flex h-6 shrink-0 items-center gap-1.5 px-1 hover:text-foreground"
                  >
                    <AssetAvatar mint={token.mint} symbol={token.symbol} className="size-4" />
                    <span className="font-semibold text-foreground">{token.symbol}</span>
                    <span>{formatPrice(token.priceUsd)}</span>
                    <ChangeText value={token.priceChange24hPct} />
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <span className="px-3">Waiting for market data</span>
          )}
        </nav>
        {!!tokens.length && (
          <button
            type="button"
            className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground motion-reduce:hidden"
            aria-label={paused ? "Resume market ticker" : "Pause market ticker"}
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? <Play className="size-3" aria-hidden /> : <Pause className="size-3" aria-hidden />}
          </button>
        )}
      </div>
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
