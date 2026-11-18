"use client";

import { useQuery } from "@tanstack/react-query";
import { MessageSquareText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLiveTrades } from "@/hooks/use-live-trades";
import { useMarketDataSource } from "@/hooks/use-market-data-source";
import { useNow } from "@/hooks/use-now";
import type { Trade } from "@/lib/api/client";
import { tokenQueries, useToken } from "@/lib/api/queries";
import { tokenSupply } from "@/lib/candles";
import {
  formatAmount,
  formatCompactUsd,
  formatPrice,
  formatUsd,
  shortAddress,
  timeAgo,
  utcTimestamp,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTerminalStore } from "@/stores/terminal";
import { SwapHistoryPanel } from "./swap-history-panel";
import { HoldersPanel, PositionsPanel, TradersPanel } from "./token-activity-panels";

function ActivityTable({ mint }: { mint: string }) {
  const source = useMarketDataSource();
  const { data: trades = [], isPending, isError } = useQuery(tokenQueries.trades(mint));
  const { data: token } = useToken(mint);
  const supply = tokenSupply(token);
  const mode = useTerminalStore((s) => s.chartMode);
  const [side, setSide] = useState("all");
  const [minimum, setMinimum] = useState("");
  const [recent, setRecent] = useState<Record<string, number>>({});
  const onTrade = useCallback(
    (trade: Trade) => setRecent((previous) => ({ ...previous, [trade.signature]: Date.now() })),
    [],
  );
  useLiveTrades(mint, onTrade);
  const now = useNow();
  useEffect(() => {
    if (!now) return;
    setRecent((previous) =>
      Object.fromEntries(Object.entries(previous).filter(([, time]) => now - time < 2500)),
    );
  }, [now]);
  const visible = trades.filter(
    (trade) =>
      (side === "all" || trade.side === side) && trade.amountUsd >= Math.max(0, Number(minimum) || 0),
  );
  if (isPending) return <p className="p-4 text-muted-foreground">Loading activity…</p>;
  if (isError) return <p className="p-4 text-muted-foreground">Trades unavailable.</p>;
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/60 px-4 py-3 text-xs">
        <select
          aria-label="Trade type"
          className="h-9 rounded-md border bg-background/60 px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={side}
          onChange={(e) => setSide(e.target.value)}
        >
          <option value="all">All</option>
          <option value="buy">Buys</option>
          <option value="sell">Sells</option>
        </select>
        <label className="inline-flex items-center gap-1">
          Min size (USD)
          <input
            className="h-9 w-24 rounded-md border bg-background/60 px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            type="number"
            min="0"
            value={minimum}
            onChange={(e) => setMinimum(e.target.value)}
          />
        </label>
      </div>
      <Table className="[&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4">
        <TableHeader className="sticky top-0 bg-card">
          <TableRow>
            <TableHead>Age</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">{mode === "mcap" ? "MCap" : "Price"}</TableHead>
            <TableHead className="text-right">Amount (USD)</TableHead>
            <TableHead className="text-right">Token amount</TableHead>
            <TableHead>Trader</TableHead>
            <TableHead>Tx</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((t) => (
            <TableRow
              key={t.signature}
              className={cn(
                "h-12 border-border/50 transition-colors duration-700",
                recent[t.signature] && "bg-positive/10",
              )}
            >
              <TableCell className="tabular text-muted-foreground" title={utcTimestamp(t.time)}>
                {now ? timeAgo(t.time, now) : ""}
              </TableCell>
              <TableCell>
                <span className={cn("font-medium", t.side === "buy" ? "text-positive" : "text-negative")}>
                  {t.side === "buy" ? "Buy" : "Sell"}
                </span>
              </TableCell>
              <TableCell className="tabular text-right">
                {mode === "mcap"
                  ? formatCompactUsd(supply === null ? null : t.priceUsd * supply)
                  : formatPrice(t.priceUsd)}
              </TableCell>
              <TableCell className="tabular text-right">{formatUsd(t.amountUsd)}</TableCell>
              <TableCell className="tabular text-right">{formatAmount(t.tokenAmount)}</TableCell>
              <TableCell className="font-mono text-xs">
                <a
                  className="hover:underline"
                  href={`https://solscan.io/account/${t.trader}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {shortAddress(t.trader)}
                </a>
              </TableCell>
              <TableCell>
                {source === "mock" ? (
                  <span className="text-muted-foreground text-xs">Demo</span>
                ) : (
                  <a
                    className="text-muted-foreground hover:underline"
                    href={`https://solscan.io/tx/${t.signature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`View transaction ${t.signature}`}
                  >
                    ↗
                  </a>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!visible.length && <p className="p-4 text-muted-foreground">No trades match these filters.</p>}
    </>
  );
}

const MAX_THESIS = 280;

function ThesisPanel({ mint }: { mint: string }) {
  const { data: comments = [], isPending } = useQuery(tokenQueries.comments(mint));
  const auth = useAuth();
  const [draft, setDraft] = useState("");
  const now = useNow(30_000);
  return (
    <div className="space-y-4 p-4">
      <div className="rounded-lg border bg-background/60 p-3 focus-within:ring-2 focus-within:ring-ring/60">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_THESIS))}
          placeholder="Share your thesis on this token"
          aria-label="Thesis"
          rows={2}
          className="w-full resize-none bg-transparent outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between">
          <span className="tabular text-muted-foreground text-xs">
            {draft.length}/{MAX_THESIS}
          </span>
          <Button size="sm" disabled={!draft.trim() || !auth.authenticated} onClick={auth.login}>
            {auth.authenticated ? "Post" : "Sign in to post"}
          </Button>
        </div>
      </div>
      {isPending && <p className="text-muted-foreground">Loading theses…</p>}
      <ul className="space-y-2">
        {comments.map((c) => (
          <li key={c.id} className="rounded-md border p-3">
            <div className="mb-1 flex items-center gap-2 text-xs">
              <span className="font-medium text-foreground">@{c.handle}</span>
              {c.position !== "none" && (
                <Badge
                  variant="outline"
                  className={cn(
                    "h-5 text-[11px]",
                    c.position === "long"
                      ? "border-positive/40 text-positive"
                      : "border-negative/40 text-negative",
                  )}
                >
                  {c.position === "long" ? "Holding" : "Exited"}
                </Badge>
              )}
              <span className="ml-auto text-muted-foreground" title={utcTimestamp(c.createdAt)}>
                {now ? `${timeAgo(c.createdAt, now)} ago` : ""}
              </span>
            </div>
            <p>{c.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ActivityPanel({ mint }: { mint: string }) {
  return (
    <section
      aria-label="Market activity"
      className="flex min-h-[280px] min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card"
    >
      <Tabs defaultValue="activity" className="flex min-h-0 min-w-0 flex-1 flex-col gap-0">
        <div className="min-w-0 shrink-0 overflow-x-auto border-b pb-1">
          <TabsList variant="line" className="h-12 w-max min-w-full justify-start gap-3 px-4">
            <TabsTrigger value="activity" className="flex-none">
              Trades
            </TabsTrigger>
            <TabsTrigger value="holders" className="flex-none">
              Holders
            </TabsTrigger>
            <TabsTrigger value="positions" className="flex-none">
              Positions
            </TabsTrigger>
            <TabsTrigger value="swaps" className="flex-none">
              My swaps
            </TabsTrigger>
            <TabsTrigger value="traders" className="flex-none">
              Traders
            </TabsTrigger>
            <TabsTrigger value="thesis" className="flex-none gap-1.5">
              <MessageSquareText className="size-3.5" aria-hidden />
              Thesis
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="activity" className="min-h-0 flex-1 overflow-auto">
          <ActivityTable key={mint} mint={mint} />
        </TabsContent>
        <TabsContent value="holders" className="min-h-0 flex-1 overflow-auto">
          <HoldersPanel key={mint} mint={mint} />
        </TabsContent>
        <TabsContent value="positions" className="min-h-0 flex-1 overflow-auto">
          <PositionsPanel key={mint} mint={mint} />
        </TabsContent>
        <TabsContent value="swaps" className="min-h-0 flex-1 overflow-auto">
          <SwapHistoryPanel mint={mint} />
        </TabsContent>
        <TabsContent value="traders" className="min-h-0 flex-1 overflow-auto">
          <TradersPanel key={mint} mint={mint} />
        </TabsContent>
        <TabsContent value="thesis" className="min-h-0 flex-1 overflow-auto">
          <ThesisPanel mint={mint} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
