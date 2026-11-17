"use client";

import { env } from "@/env";
import { useMarketDataSource } from "@/hooks/use-market-data-source";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";
import { useRealtimeStore } from "@/stores/realtime";

const LABEL = { connecting: "Connecting", open: "Live", closed: "Reconnecting" } as const;

export function StatusStrip() {
  const source = useMarketDataSource();
  const { status, lastMessageAt } = useRealtimeStore();
  const now = useNow();
  const ago = lastMessageAt && now ? Math.max(0, Math.round((now - lastMessageAt) / 1000)) : null;
  return (
    <footer className="hidden h-7 md:flex shrink-0 items-center gap-4 border-t bg-sidebar px-3 text-muted-foreground text-xs">
      <span className="inline-flex items-center gap-1.5" aria-live="polite">
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            status === "open" ? "bg-positive" : status === "closed" ? "bg-negative" : "bg-warning",
          )}
        />
        Market data: {LABEL[status]}
      </span>
      <span className="tabular">{ago === null ? "No updates yet" : `Last update ${ago}s ago`}</span>
      <span>Source: {source === "mock" ? "demo fixtures" : "live"}</span>
      <span className="ml-auto">Solana {env.NEXT_PUBLIC_SOLANA_CLUSTER}</span>
      <a
        href="https://www.tradingview.com"
        target="_blank"
        rel="noreferrer"
        className="hover:text-foreground"
      >
        Charts by TradingView
      </a>
    </footer>
  );
}
