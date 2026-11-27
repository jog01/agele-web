"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { AssetAvatar } from "@/components/common/asset-avatar";
import { CopyAddress } from "@/components/common/copy-address";
import { TokenAssetAvatar } from "@/components/common/token-asset-avatar";
import { TraderAvatar } from "@/components/social/trader-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFollow } from "@/hooks/use-follow";
import { ApiError, type LeaderboardWindow } from "@/lib/api/client";
import { LEADERBOARD_WINDOWS } from "@/lib/api/leaderboard";
import type { components } from "@/lib/api/schema";
import { traderProfileQuery, traderTradesQuery } from "@/lib/api/traders";
import { changeTone, formatAmount, formatPct, formatUsd, utcTimestamp } from "@/lib/format";
import { solanaCluster } from "@/lib/solana/cluster";
import { cn } from "@/lib/utils";
import { PROFILE_FRAME, TraderProfileLoading, TraderTableSkeleton } from "./trader-profile-loading";

const COUNT = new Intl.NumberFormat("en-US");
const LINK = "font-medium text-primary hover:underline focus-visible:underline";

function ProfileAnnouncement({ handle }: { handle: string }) {
  const [message, setMessage] = useState("");
  useEffect(() => {
    // Next announces on navigation, before the profile query resolves.
    const timeout = window.setTimeout(() => setMessage(`Trader profile: ${handle}`), 100);
    return () => window.clearTimeout(timeout);
  }, [handle]);
  return (
    <span role="status" aria-atomic="true" className="sr-only">
      {message}
    </span>
  );
}

function Metric({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-0 rounded bg-background px-3 py-2.5">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className={cn("tabular mt-1 wrap-anywhere font-medium text-[15px]", className)}>{value}</dd>
    </div>
  );
}

function TraderStats({
  stats,
  initialWindow,
}: {
  stats: components["schemas"]["TraderProfile"]["stats"];
  initialWindow: LeaderboardWindow;
}) {
  const [window, setWindow] = useState(initialWindow);
  const { rank, pnlUsd, pnlPct, volumeUsd, trades, winRatePct } = stats[window];
  return (
    <section className="space-y-4 rounded-md border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-medium text-sm">Leaderboard performance</h2>
        <ToggleGroup
          type="single"
          variant="outline"
          value={window}
          onValueChange={(value) => {
            const next = LEADERBOARD_WINDOWS.find((w) => w === value);
            if (next) setWindow(next);
          }}
          aria-label="Performance window"
        >
          {LEADERBOARD_WINDOWS.map((w) => (
            <ToggleGroupItem key={w} value={w} className="h-11 px-4 text-xs lg:h-10 lg:px-3">
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

function TraderPositions({ positions }: { positions: components["schemas"]["TraderProfile"]["positions"] }) {
  const rows = positions.filter((position) => position !== null);
  return (
    <section className="min-w-0 overflow-hidden rounded-md border bg-card">
      <h2 className="p-4 font-medium text-sm sm:px-5">Open positions</h2>
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
                  <Link
                    href={`/trade/${encodeURIComponent(position.mint)}`}
                    className={cn(LINK, "inline-flex items-center gap-1.5")}
                  >
                    {position.imageUrl ? (
                      <AssetAvatar imageUrl={position.imageUrl} className="size-4" />
                    ) : (
                      <TokenAssetAvatar mint={position.mint} className="size-4" />
                    )}
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
        <p className="min-h-24 border-t px-4 py-6 text-muted-foreground text-sm sm:px-5">
          No open positions.
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
    <section className="min-w-0 overflow-hidden rounded-md border bg-card">
      <h2 className="p-4 font-medium text-sm sm:px-5">Recent trades</h2>
      {trades.isPending && <TraderTableSkeleton label="Loading trades" />}
      {trades.isError && (
        <div className="flex flex-wrap items-center gap-2 px-4 pb-4 text-muted-foreground text-sm sm:px-5">
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
        <p className="min-h-24 border-t px-4 py-6 text-muted-foreground text-sm sm:px-5">No trades yet.</p>
      )}
      {rows.length > 0 && (
        <Table aria-label="Recent trades">
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
                    <Link
                      href={`/trade/${encodeURIComponent(trade.mint)}`}
                      className={cn(LINK, "inline-flex items-center gap-1.5")}
                    >
                      {trade.imageUrl ? (
                        <AssetAvatar imageUrl={trade.imageUrl} className="size-4" />
                      ) : (
                        <TokenAssetAvatar mint={trade.mint} className="size-4" />
                      )}
                      {trade.symbol}
                    </Link>
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
    </section>
  );
}

function FollowTrader({
  wallet,
  routeWallet,
  isFollowing,
}: {
  wallet: string;
  routeWallet: string;
  isFollowing?: boolean;
}) {
  const auth = useAuth();
  const follow = useFollow();
  if (!auth.authenticated) {
    return auth.configured ? (
      <Button variant="outline" disabled={!auth.ready} onClick={auth.login}>
        Sign in to follow
      </Button>
    ) : (
      <p className="text-muted-foreground text-sm">Sign-in isn’t configured, so following is unavailable.</p>
    );
  }
  if (auth.walletAddress === wallet || auth.walletAddress === routeWallet) return null;
  if (isFollowing === undefined)
    return <p className="text-muted-foreground text-sm">Follow status unavailable.</p>;

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        disabled={follow.isPending}
        onClick={() => follow.mutate({ wallet, isFollowing: !isFollowing })}
      >
        {follow.isPending ? "Updating…" : isFollowing ? "Unfollow" : "Follow"}
      </Button>
      {follow.isError && (
        <p role="alert" className="text-muted-foreground text-sm">
          {follow.error.message}
        </p>
      )}
      {follow.isSuccess && !follow.variables.isFollowing && isFollowing && (
        <p role="status" className="text-muted-foreground text-sm">
          Still following this trader. You may follow another linked wallet.
        </p>
      )}
    </div>
  );
}

export function TraderProfileView({
  wallet,
  initialWindow = "7d",
}: {
  wallet: string;
  initialWindow?: LeaderboardWindow;
}) {
  const auth = useAuth();
  const { data, error, isPending, refetch } = useQuery(traderProfileQuery(wallet, auth));
  if (isPending) return <TraderProfileLoading />;

  const missing = error instanceof ApiError && (error.status === 400 || error.status === 404);
  return (
    <div className={PROFILE_FRAME}>
      <Link
        href={`/leaderboard?window=${initialWindow}`}
        className={cn("inline-flex min-h-10 items-center gap-1.5 text-xs pointer-coarse:min-h-11", LINK)}
      >
        <ArrowLeft aria-hidden className="size-4" />
        Leaderboard
      </Link>
      {data && error && !missing && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-4 text-muted-foreground text-sm"
        >
          <p>Couldn’t refresh the profile. Showing the last loaded data.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}
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
          <section className="overflow-hidden rounded-md border bg-card">
            <div className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5">
              <div className="flex min-w-0 items-start gap-3">
                <TraderAvatar
                  handle={data.handle}
                  displayName={data.displayName}
                  avatarUrl={data.avatarUrl}
                  size="lg"
                  className="size-11"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="min-w-0 wrap-anywhere font-semibold text-xl tracking-tight">
                      {data.displayName || data.handle}
                    </h1>
                    {data.displayName && data.displayName !== data.handle && (
                      <span className="text-muted-foreground text-sm">@{data.handle}</span>
                    )}
                    <Badge
                      variant="outline"
                      className={
                        data.dataSource === "demo"
                          ? "border-border/80 bg-secondary/60 text-muted-foreground"
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
                  {data.bio && (
                    <p className="mt-1 max-w-2xl text-muted-foreground text-sm leading-5">{data.bio}</p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-x-2">
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
                  <p className="tabular mt-1 flex flex-wrap gap-x-3 text-muted-foreground text-xs">
                    <span>
                      <strong className="text-foreground">{COUNT.format(data.followers)}</strong> followers
                    </span>
                    <span>
                      <strong className="text-foreground">{COUNT.format(data.following)}</strong> following
                    </span>
                  </p>
                </div>
              </div>
              <div className="max-w-64 text-xs">
                <FollowTrader wallet={data.wallet} routeWallet={wallet} isFollowing={data.isFollowing} />
                {data.dataSource === "demo" && (
                  <p className="mt-2 text-[11px] text-muted-foreground">Simulated history & performance.</p>
                )}
              </div>
            </div>
            <dl className="grid grid-cols-2 divide-x border-t bg-background/30">
              {[
                { label: "Realized PnL", value: data.realizedPnlUsd },
                { label: "Unrealized PnL", value: data.unrealizedPnlUsd },
              ].map(({ label, value }) => (
                <div key={label} className="min-w-0 px-4 py-3 sm:px-5">
                  <dt className="text-[11px] text-muted-foreground">{label}</dt>
                  <dd className={cn("tabular mt-1 wrap-anywhere font-medium text-lg", changeTone(value))}>
                    {formatUsd(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <TraderStats stats={data.stats} initialWindow={initialWindow} />
          <div className="grid items-start gap-4 xl:grid-cols-2">
            <TraderPositions positions={data.positions} />
            <TraderTrades wallet={wallet} />
          </div>
        </>
      )}
    </div>
  );
}
