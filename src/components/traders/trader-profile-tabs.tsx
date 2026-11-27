"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { ExternalLink, Heart, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { AssetAvatar } from "@/components/common/asset-avatar";
import { TokenAssetAvatar } from "@/components/common/token-asset-avatar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useNow } from "@/hooks/use-now";
import type { FeedItem } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { feedItemContent } from "@/lib/api/social";
import { type TraderFeedFilter, traderFeedQuery, traderTradesQuery } from "@/lib/api/traders";
import { changeTone, formatAmount, formatPct, formatUsd, timeAgo, utcTimestamp } from "@/lib/format";
import { solanaCluster } from "@/lib/solana/cluster";
import { cn } from "@/lib/utils";
import { TraderTableSkeleton } from "./trader-profile-loading";

const LINK = "font-medium text-primary hover:underline focus-visible:underline";
const SEGMENT = "h-8 px-3 text-xs";
const MIN_SIZES = [0, 100, 1_000, 10_000] as const;
type PositionsView = "open" | "closed" | "top";

export function TokenLink({
  mint,
  symbol,
  imageUrl,
}: {
  mint: string;
  symbol: string;
  imageUrl: string | null;
}) {
  return (
    <Link
      href={`/trade/${encodeURIComponent(mint)}`}
      className={cn(LINK, "inline-flex items-center gap-1.5")}
    >
      {imageUrl ? (
        <AssetAvatar imageUrl={imageUrl} className="size-4" />
      ) : (
        <TokenAssetAvatar mint={mint} className="size-4" />
      )}
      {symbol}
    </Link>
  );
}

function Segments<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={String(value)}
      onValueChange={(next) => {
        const match = options.find((o) => String(o.value) === next);
        if (match) onChange(match.value);
      }}
      aria-label={label}
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.value} value={String(o.value)} className={SEGMENT}>
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function PagedStatus({
  query,
  noun,
  empty,
  hasRows,
}: {
  query: {
    isPending: boolean;
    isError: boolean;
    isSuccess: boolean;
    isFetching: boolean;
    isFetchingNextPage: boolean;
    isFetchNextPageError: boolean;
    hasNextPage: boolean;
    fetchNextPage: () => unknown;
    refetch: () => unknown;
  };
  noun: string;
  empty: string;
  hasRows: boolean;
}) {
  return (
    <>
      {query.isPending && <TraderTableSkeleton label={`Loading ${noun}`} />}
      {query.isError && (
        <div className="flex flex-wrap items-center gap-2 p-4 text-muted-foreground text-sm sm:px-5">
          <p role="alert">
            {query.isFetchNextPageError
              ? `Couldn’t load more ${noun}.`
              : `${noun[0].toUpperCase()}${noun.slice(1)} unavailable.`}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={query.isFetching}
            onClick={() => (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())}
          >
            Retry
          </Button>
        </div>
      )}
      {query.isSuccess && !hasRows && (
        <p className="min-h-24 px-4 py-6 text-muted-foreground text-sm sm:px-5">{empty}</p>
      )}
      {query.isFetchingNextPage && <TraderTableSkeleton label={`Loading more ${noun}`} rows={1} />}
      {query.hasNextPage && !query.isFetchNextPageError && (
        <div className="border-t p-4 sm:px-5">
          <Button
            variant="outline"
            size="sm"
            disabled={query.isFetching}
            onClick={() => query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </>
  );
}

function ClosedPositions({ wallet }: { wallet: string }) {
  const auth = useAuth();
  const closed = useInfiniteQuery(traderFeedQuery(wallet, { types: "closed" }, auth));
  const rows = (closed.data?.pages ?? [])
    .flatMap((page) => page.items)
    .filter((item): item is Extract<FeedItem, { kind: "trade" }> => item.kind === "trade");
  return (
    <div>
      {rows.length > 0 && (
        <Table aria-label="Closed positions">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4 sm:pl-5">Token</TableHead>
              <TableHead className="text-right">Exit value</TableHead>
              <TableHead className="pr-4 text-right sm:pr-5">Realized PnL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="pl-4 sm:pl-5">
                  <TokenLink mint={item.mint} symbol={item.symbol} imageUrl={item.imageUrl} />
                  <div className="text-muted-foreground text-xs">
                    Closed{" "}
                    <time dateTime={utcTimestamp(item.createdAt)}>
                      {utcTimestamp(item.createdAt).slice(0, 10)}
                    </time>
                  </div>
                </TableCell>
                <TableCell className="tabular text-right">{formatUsd(item.amountUsd)}</TableCell>
                <TableCell className={cn("tabular pr-4 text-right sm:pr-5", changeTone(item.realizedPnlUsd))}>
                  {item.realizedPnlUsd === null ? "—" : formatUsd(item.realizedPnlUsd)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <PagedStatus
        query={closed}
        noun="closed positions"
        empty="No closed positions yet."
        hasRows={rows.length > 0}
      />
    </div>
  );
}

function FeedRow({ item, now }: { item: FeedItem; now: number | null }) {
  const content = feedItemContent(item);
  return (
    <li className="flex items-start gap-3 px-4 py-3 sm:px-5">
      <AssetAvatar imageUrl={item.imageUrl} className="mt-0.5 size-7 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate text-sm">
            <span className={cn("font-medium", content.tone)}>{content.label}</span>{" "}
            <Link href={`/trade/${encodeURIComponent(item.mint)}`} className="font-medium hover:underline">
              {item.symbol}
            </Link>
          </p>
          <time
            dateTime={utcTimestamp(item.createdAt)}
            title={utcTimestamp(item.createdAt)}
            className="shrink-0 text-muted-foreground text-xs"
          >
            {now ? `${timeAgo(item.createdAt, now)} ago` : ""}
          </time>
        </div>
        {item.kind === "thesis" ? (
          <p className="mt-1 line-clamp-2 text-foreground/90 text-sm leading-5">{item.body}</p>
        ) : (
          <p className="tabular mt-0.5 text-muted-foreground text-xs">{content.attachment}</p>
        )}
        <p className="tabular mt-1.5 flex items-center gap-3 text-muted-foreground text-xs">
          <span className="inline-flex items-center gap-1" title="Likes">
            <Heart aria-hidden className="size-3" />
            <span className="sr-only">Likes</span>
            {item.likeCount}
          </span>
          <span className="inline-flex items-center gap-1" title="Replies">
            <MessageSquare aria-hidden className="size-3" />
            <span className="sr-only">Replies</span>
            {item.replyCount}
          </span>
        </p>
      </div>
    </li>
  );
}

function TraderFeed({ wallet }: { wallet: string }) {
  const auth = useAuth();
  const now = useNow(30_000);
  const [filter, setFilter] = useState<TraderFeedFilter>("all");
  const [minSize, setMinSize] = useState<(typeof MIN_SIZES)[number]>(0);
  const feed = useInfiniteQuery(traderFeedQuery(wallet, { filter, minSizeUsd: minSize || undefined }, auth));
  const items = (feed.data?.pages ?? []).flatMap((page) => page.items);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-5">
        <Segments
          label="Feed filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "trades", label: "Trades" },
            { value: "theses", label: "Theses" },
          ]}
        />
        {filter !== "theses" && (
          <Segments
            label="Minimum trade size"
            value={minSize}
            onChange={setMinSize}
            options={MIN_SIZES.map((size) => ({
              value: size,
              label: size ? `$${size >= 1000 ? `${size / 1000}K` : size}+` : "Any size",
            }))}
          />
        )}
      </div>
      {items.length > 0 && (
        <ul aria-label="Trader feed" className="divide-y">
          {items.map((item) => (
            <FeedRow key={item.id} item={item} now={now} />
          ))}
        </ul>
      )}
      <PagedStatus
        query={feed}
        noun="feed"
        empty={minSize ? "No activity at this size." : "No activity yet."}
        hasRows={items.length > 0}
      />
    </div>
  );
}

type Positions = components["schemas"]["TraderProfile"]["positions"];
type TopTrades = components["schemas"]["TraderProfile"]["topTrades"];

export function TraderPositionsPanel({
  wallet,
  positions,
  topTrades,
}: {
  wallet: string;
  positions: Positions;
  topTrades: TopTrades;
}) {
  const [view, setView] = useState<PositionsView>("open");
  const open = positions.filter((position) => position !== null).length;
  return (
    <section
      aria-labelledby="positions-heading"
      className="min-w-0 overflow-hidden rounded-md border bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-5">
        <h2 id="positions-heading" className="font-medium text-sm">
          Positions <span className="tabular text-muted-foreground">{open}</span>
        </h2>
        <Segments
          label="Positions view"
          value={view}
          onChange={setView}
          options={[
            { value: "open", label: "Open" },
            { value: "closed", label: "Closed" },
            { value: "top", label: "Top trades" },
          ]}
        />
      </div>
      {view === "open" && <OpenPositions positions={positions} />}
      {view === "closed" && <ClosedPositions wallet={wallet} />}
      {view === "top" && <TopTradesTable trades={topTrades} />}
    </section>
  );
}

function TopTradesTable({ trades }: { trades: TopTrades }) {
  if (!trades.length) {
    return <p className="min-h-24 px-4 py-6 text-muted-foreground text-sm sm:px-5">No closed trades yet.</p>;
  }
  return (
    <Table aria-label="Top trades">
      <TableHeader>
        <TableRow>
          <TableHead className="pl-4 sm:pl-5">Token</TableHead>
          <TableHead className="pr-4 text-right sm:pr-5">Realized PnL</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trades.map((trade, index) => (
          <TableRow key={trade.positionId}>
            <TableCell className="pl-4 sm:pl-5">
              <div className="flex items-center gap-2">
                <span className="tabular w-5 text-muted-foreground text-xs">#{index + 1}</span>
                <TokenLink mint={trade.mint} symbol={trade.symbol} imageUrl={trade.imageUrl} />
              </div>
              <div className="pl-7 text-muted-foreground text-xs">
                Closed{" "}
                <time dateTime={utcTimestamp(trade.closedAt)}>
                  {utcTimestamp(trade.closedAt).slice(0, 10)}
                </time>
              </div>
            </TableCell>
            <TableCell className={cn("tabular pr-4 text-right sm:pr-5", changeTone(trade.realizedPnlUsd))}>
              {formatUsd(trade.realizedPnlUsd)}
              <div className="text-xs">{formatPct(trade.realizedPnlPct)}</div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function OpenPositions({ positions }: { positions: Positions }) {
  const rows = positions.filter((position) => position !== null);
  return (
    <div>
      {rows.length ? (
        <Table aria-label="Open positions">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4 sm:pl-5">Token</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="pr-4 text-right sm:pr-5">Unrealized PnL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((position) => (
              <TableRow key={position.mint}>
                <TableCell className="pl-4 sm:pl-5">
                  <TokenLink mint={position.mint} symbol={position.symbol} imageUrl={position.imageUrl} />
                  <div className="tabular text-muted-foreground text-xs">
                    {formatAmount(position.quantity)}
                  </div>
                </TableCell>
                <TableCell className="tabular text-right">{formatUsd(position.valueUsd)}</TableCell>
                <TableCell
                  className={cn("tabular pr-4 text-right sm:pr-5", changeTone(position.unrealizedPnlUsd))}
                >
                  {formatUsd(position.unrealizedPnlUsd)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="min-h-24 px-4 py-6 text-muted-foreground text-sm sm:px-5">No open positions.</p>
      )}
    </div>
  );
}

function TraderTransactions({ wallet }: { wallet: string }) {
  const auth = useAuth();
  const trades = useInfiniteQuery(traderTradesQuery(wallet, auth));
  const pages = trades.data?.pages ?? [];
  const rows = pages.flatMap(({ trades, dataSource }) => trades.map((trade) => ({ trade, dataSource })));
  return (
    <div>
      {trades.isPending && <TraderTableSkeleton label="Loading trades" />}
      {trades.isError && (
        <div className="flex flex-wrap items-center gap-2 p-4 text-muted-foreground text-sm sm:px-5">
          <p role="alert">
            {trades.isFetchNextPageError
              ? "Couldn’t load more trades."
              : rows.length
                ? "Couldn’t update trades."
                : "Trades unavailable."}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={trades.isFetching}
            onClick={() => (trades.isFetchNextPageError ? trades.fetchNextPage() : trades.refetch())}
          >
            Retry
          </Button>
        </div>
      )}
      {trades.isSuccess && !rows.length && (
        <p className="min-h-24 px-4 py-6 text-muted-foreground text-sm sm:px-5">No trades yet.</p>
      )}
      {rows.length > 0 && (
        <Table aria-label="Transactions">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4 sm:pl-5">Trade</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="pr-4 text-right sm:pr-5">Realized PnL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ trade, dataSource }) => (
              <TableRow key={trade.id}>
                <TableCell className="whitespace-normal pl-4 sm:pl-5">
                  <div className="flex items-center gap-1.5">
                    <span className={trade.side === "buy" ? "text-positive" : "text-negative"}>
                      {trade.side === "buy" ? "Buy" : "Sell"}
                    </span>
                    <TokenLink mint={trade.mint} symbol={trade.symbol} imageUrl={trade.imageUrl} />
                  </div>
                  <div className="tabular mt-0.5 text-muted-foreground text-xs">
                    {formatAmount(trade.tokenAmount)}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-2 text-muted-foreground text-xs">
                    <time dateTime={new Date(trade.time * 1000).toISOString()}>
                      {utcTimestamp(trade.time)}
                    </time>
                    {dataSource === "indexed" && (
                      <a
                        href={`https://solscan.io/tx/${encodeURIComponent(trade.signature)}${solanaCluster().explorerQuery}`}
                        target="_blank"
                        rel="noreferrer"
                        className={LINK}
                      >
                        Solscan <ExternalLink aria-hidden className="inline size-3" />
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell className="tabular text-right">{formatUsd(trade.valueUsd)}</TableCell>
                <TableCell
                  className={cn("tabular pr-4 text-right sm:pr-5", changeTone(trade.realizedPnlUsd))}
                >
                  {formatUsd(trade.realizedPnlUsd)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {trades.isFetchingNextPage && <TraderTableSkeleton label="Loading more trades" rows={1} />}
      {trades.hasNextPage && !trades.isFetchNextPageError && (
        <div className="border-t p-4 sm:px-5">
          <Button variant="outline" disabled={trades.isFetching} onClick={() => trades.fetchNextPage()}>
            {trades.isFetchingNextPage ? "Loading…" : "Load more trades"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function TraderActivityPanel({ wallet }: { wallet: string }) {
  return (
    <Tabs defaultValue="feed" className="min-w-0 gap-0 overflow-hidden rounded-md border bg-card">
      <TabsList variant="line" className="h-11 w-full justify-start gap-4 border-b px-4 sm:px-5">
        <TabsTrigger value="feed" className="flex-none px-0">
          Feed
        </TabsTrigger>
        <TabsTrigger value="transactions" className="flex-none px-0">
          Transactions
        </TabsTrigger>
      </TabsList>
      <TabsContent value="feed">
        <TraderFeed wallet={wallet} />
      </TabsContent>
      <TabsContent value="transactions">
        <TraderTransactions wallet={wallet} />
      </TabsContent>
    </Tabs>
  );
}
