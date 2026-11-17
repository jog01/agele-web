"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { CopyAddress } from "@/components/common/copy-address";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ApiError, type LeaderboardWindow } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { traderProfileQuery, traderTradesQuery } from "@/lib/api/traders";
import { changeTone, formatAmount, formatPct, formatUsd, utcTimestamp } from "@/lib/format";
import { solanaCluster } from "@/lib/solana/cluster";
import { cn } from "@/lib/utils";

const WINDOWS = ["24h", "7d", "30d"] as const satisfies readonly LeaderboardWindow[];
const COUNT = new Intl.NumberFormat("en-US");
const FRAME = "mx-auto max-w-[1000px] space-y-4 px-4 py-6 sm:px-6";
const LINK = "font-medium text-primary hover:underline focus-visible:underline";

export function TraderProfileLoading() {
  return (
    <div className={FRAME}>
      <p role="status" className="text-muted-foreground">
        Loading trader profile…
      </p>
    </div>
  );
}

function ProfileAnnouncement({ handle }: { handle?: string }) {
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!handle) return;
    // Next announces on navigation, before the profile query resolves.
    const timeout = window.setTimeout(() => setMessage(`Trader profile: ${handle}`), 100);
    return () => window.clearTimeout(timeout);
  }, [handle]);
  return (
    <span role="status" aria-atomic="true" className="sr-only">
      {handle ? message : ""}
    </span>
  );
}

function Metric({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-0 rounded-md bg-background px-3 py-2">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={cn("tabular wrap-anywhere font-medium", className)}>{value}</dd>
    </div>
  );
}

function TraderStats({ stats }: { stats: components["schemas"]["TraderProfile"]["stats"] }) {
  const [window, setWindow] = useState<LeaderboardWindow>("7d");
  const { rank, pnlUsd, pnlPct, volumeUsd, trades, winRatePct } = stats[window];
  return (
    <section className="space-y-3 rounded-lg border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Leaderboard performance</h2>
        <ToggleGroup
          type="single"
          variant="outline"
          value={window}
          onValueChange={(value) => {
            const next = WINDOWS.find((w) => w === value);
            if (next) setWindow(next);
          }}
          aria-label="Performance window"
        >
          {WINDOWS.map((w) => (
            <ToggleGroupItem key={w} value={w} className="h-10 px-4 lg:h-8 lg:px-3">
              {w}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Rank" value={rank == null ? "Unranked" : `#${COUNT.format(rank)}`} />
        <Metric label="Net PnL" value={formatUsd(pnlUsd)} className={changeTone(pnlUsd)} />
        <Metric label="Return" value={formatPct(pnlPct)} className={changeTone(pnlPct)} />
        <Metric label="Volume" value={formatUsd(volumeUsd)} />
        <Metric label="Trades" value={COUNT.format(trades)} />
        <Metric label="Win rate" value={formatPct(winRatePct, { signed: false })} />
      </dl>
    </section>
  );
}

function TraderPositions({
  positions,
  demo,
}: {
  positions: components["schemas"]["TraderProfile"]["positions"];
  demo: boolean;
}) {
  const rows = positions.filter((position) => position !== null);
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <h2 className="p-4 font-semibold sm:px-5">Open positions</h2>
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
                  <Link href={`/trade/${encodeURIComponent(position.mint)}`} className={LINK}>
                    {position.symbol}
                  </Link>
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
        <p className="px-4 pb-4 text-muted-foreground text-sm sm:px-5">
          {demo ? "Demo profiles don’t include positions." : "No open positions."}
        </p>
      )}
    </section>
  );
}

function TraderTrades({ wallet }: { wallet: string }) {
  const auth = useAuth();
  const trades = useInfiniteQuery(traderTradesQuery(wallet, auth));
  const pages = trades.data?.pages ?? [];
  const rows = pages.flatMap(({ trades, dataSource }) => trades.map((trade) => ({ trade, dataSource })));
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <h2 className="p-4 font-semibold sm:px-5">Recent trades</h2>
      {trades.isPending && (
        <p role="status" className="px-4 pb-4 text-muted-foreground text-sm sm:px-5">
          Loading trades…
        </p>
      )}
      {trades.isError && (
        <div className="flex flex-wrap items-center gap-2 px-4 pb-4 text-muted-foreground text-sm sm:px-5">
          <p role="alert">
            {trades.isFetchNextPageError ? "Couldn’t load more trades." : "Trades unavailable."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => (trades.isFetchNextPageError ? trades.fetchNextPage() : trades.refetch())}
          >
            Retry
          </Button>
        </div>
      )}
      {trades.isSuccess && !rows.length && (
        <p className="px-4 pb-4 text-muted-foreground text-sm sm:px-5">
          {pages[0]?.dataSource === "demo" ? "Demo profiles don’t include trade history." : "No trades yet."}
        </p>
      )}
      {rows.length > 0 && (
        <Table aria-label="Recent trades">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4 sm:pl-5">Trade</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="pr-4 text-right sm:pr-5">Realized PnL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ trade, dataSource }) => (
              <TableRow key={trade.id}>
                <TableCell className="pl-4 sm:pl-5">
                  <span className={trade.side === "buy" ? "text-positive" : "text-negative"}>
                    {trade.side === "buy" ? "Buy" : "Sell"}
                  </span>{" "}
                  <Link href={`/trade/${encodeURIComponent(trade.mint)}`} className={LINK}>
                    {trade.symbol}
                  </Link>
                  <div className="tabular text-muted-foreground text-xs">
                    {formatAmount(trade.tokenAmount)}
                  </div>
                </TableCell>
                <TableCell className="text-xs">
                  <time dateTime={new Date(trade.time * 1000).toISOString()}>{utcTimestamp(trade.time)}</time>
                  {dataSource === "indexed" && (
                    <a
                      href={`https://solscan.io/tx/${encodeURIComponent(trade.signature)}${solanaCluster().explorerQuery}`}
                      target="_blank"
                      rel="noreferrer"
                      className={cn("block", LINK)}
                    >
                      Solscan <ExternalLink aria-hidden className="inline size-3" />
                    </a>
                  )}
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
      {trades.hasNextPage && !trades.isFetchNextPageError && (
        <div className="border-t p-4 sm:px-5">
          <Button variant="outline" disabled={trades.isFetching} onClick={() => trades.fetchNextPage()}>
            {trades.isFetchingNextPage ? "Loading…" : "Load more trades"}
          </Button>
        </div>
      )}
    </section>
  );
}

export function TraderProfileView({ wallet }: { wallet: string }) {
  const auth = useAuth();
  const { data, error, isPending, refetch } = useQuery(traderProfileQuery(wallet, auth));
  if (isPending) return <TraderProfileLoading />;

  const missing = error instanceof ApiError && (error.status === 400 || error.status === 404);
  return (
    <div className={FRAME}>
      <Link href="/leaderboard" className={cn("inline-flex items-center gap-1.5 text-sm", LINK)}>
        <ArrowLeft aria-hidden className="size-4" />
        Leaderboard
      </Link>
      {missing || !data ? (
        <section className="space-y-2 rounded-lg border bg-card p-5">
          <h1 className="font-semibold text-xl">{missing ? "Trader not found" : "Profile unavailable"}</h1>
          <p role="alert" className="text-muted-foreground text-sm">
            {missing ? "We couldn’t find a trader for this wallet." : "Couldn’t load this trader’s profile."}
          </p>
          {!missing && (
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          )}
        </section>
      ) : (
        <>
          <ProfileAnnouncement handle={data.handle} />
          <section className="space-y-4 rounded-lg border bg-card p-4 sm:p-5">
            <div className="flex items-start gap-3 sm:gap-4">
              <Avatar aria-hidden className="size-12 sm:size-14">
                {data.avatarUrl && <AvatarImage src={data.avatarUrl} alt="" referrerPolicy="no-referrer" />}
                <AvatarFallback className="bg-secondary font-semibold text-primary">
                  {data.handle.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="min-w-0 wrap-anywhere font-semibold text-2xl">{data.handle}</h1>
                  <Badge
                    variant="outline"
                    className={
                      data.dataSource === "demo"
                        ? "border-warning/40 bg-warning-subtle text-warning"
                        : undefined
                    }
                  >
                    {data.dataSource === "demo"
                      ? "Demo profile"
                      : data.dataSource === "indexed"
                        ? "Indexed trades"
                        : "Data source unavailable"}
                  </Badge>
                  {auth.authenticated && data.isFollowing && <Badge variant="secondary">Following</Badge>}
                </div>
                <div className="flex flex-wrap items-center gap-x-2">
                  <CopyAddress address={data.wallet} label="Copy trader wallet address" />
                  {data.dataSource === "indexed" && (
                    <a
                      href={solanaCluster().explorerAddressUrl(encodeURIComponent(data.wallet))}
                      target="_blank"
                      rel="noreferrer"
                      className={cn("text-xs", LINK)}
                    >
                      Solana Explorer <ExternalLink aria-hidden className="inline size-3" />
                    </a>
                  )}
                </div>
                <p className="tabular flex flex-wrap gap-x-3 text-muted-foreground text-sm">
                  <span>
                    <strong className="text-foreground">{COUNT.format(data.followers)}</strong> followers
                  </span>
                  <span>
                    <strong className="text-foreground">{COUNT.format(data.following)}</strong> following
                  </span>
                </p>
              </div>
            </div>
            {data.dataSource === "demo" && (
              <p className="text-muted-foreground text-sm">Performance figures are simulated.</p>
            )}
            <dl className="grid grid-cols-2 gap-2">
              <Metric
                label="Realized PnL"
                value={formatUsd(data.realizedPnlUsd)}
                className={changeTone(data.realizedPnlUsd)}
              />
              <Metric
                label="Unrealized PnL"
                value={formatUsd(data.unrealizedPnlUsd)}
                className={changeTone(data.unrealizedPnlUsd)}
              />
            </dl>
          </section>
          <TraderStats stats={data.stats} />
          <TraderPositions positions={data.positions} demo={data.dataSource === "demo"} />
          <TraderTrades wallet={wallet} />
        </>
      )}
    </div>
  );
}
