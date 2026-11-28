"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { CopyAddress } from "@/components/common/copy-address";
import { TraderAvatar } from "@/components/social/trader-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFollow } from "@/hooks/use-follow";
import { ApiError, type LeaderboardWindow } from "@/lib/api/client";
import { LEADERBOARD_WINDOWS } from "@/lib/api/leaderboard";
import type { components } from "@/lib/api/schema";
import { traderProfileQuery } from "@/lib/api/traders";
import { changeTone, formatHold, formatPct, formatUsd } from "@/lib/format";
import { solanaCluster } from "@/lib/solana/cluster";
import { cn } from "@/lib/utils";
import { TraderMostLikedThesis } from "./trader-most-liked-thesis";
import { TraderPortfolioChart } from "./trader-portfolio-chart";
import { PROFILE_FRAME, TraderProfileLoading } from "./trader-profile-loading";
import { TraderActivityPanel, TraderPositionsPanel } from "./trader-profile-tabs";
import { TraderTopTrades } from "./trader-top-trades";

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

const JOINED = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

function ProfileMeta({ profile }: { profile: components["schemas"]["TraderProfile"] }) {
  const mutuals = profile.mutuals;
  return (
    <p className="tabular mt-1 flex flex-wrap items-center gap-x-1.5 text-muted-foreground text-xs">
      {mutuals && mutuals.count > 0 && (
        <>
          <span className="inline-flex items-center gap-1.5">
            <span className="-space-x-1.5 flex">
              {mutuals.preview.slice(0, 3).map((mutual, index) => (
                <TraderAvatar
                  key={mutual.wallet ?? index}
                  handle={mutual.wallet ?? "mutual"}
                  avatarUrl={mutual.avatarUrl}
                  className="size-4 ring-2 ring-card"
                />
              ))}
            </span>
            {COUNT.format(mutuals.count)} {mutuals.count === 1 ? "mutual" : "mutuals"}
          </span>
          <span aria-hidden>·</span>
        </>
      )}
      <span>Avg hold {formatHold(profile.avgHoldSeconds)}</span>
      <span aria-hidden>·</span>
      <span>
        {COUNT.format(profile.tradeCount)} {profile.tradeCount === 1 ? "trade" : "trades"}
      </span>
      <span aria-hidden>·</span>
      <span>Joined {JOINED.format(profile.joinedAt * 1000)}</span>
    </p>
  );
}

function Metric({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-0 py-1">
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
    <section className="space-y-3 border-border/60 border-t px-1 pt-5">
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
      <dl className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
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
      <Button variant="outline" disabled aria-label="Follow unavailable: sign-in is unavailable">
        Follow
      </Button>
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
                  <ProfileMeta profile={data} />
                </div>
              </div>
              <div className="shrink-0 text-xs">
                <FollowTrader wallet={data.wallet} routeWallet={wallet} isFollowing={data.isFollowing} />
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
          <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="grid min-w-0 grid-cols-1 gap-4">
              <TraderPortfolioChart wallet={wallet} />
              <TraderTopTrades wallet={data.wallet} trades={data.topTrades} />
              <TraderPositionsPanel wallet={wallet} positions={data.positions} topTrades={data.topTrades} />
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-4">
              {data.mostLikedThesis && (
                <TraderMostLikedThesis wallet={data.wallet} thesis={data.mostLikedThesis} />
              )}
              <TraderActivityPanel wallet={wallet} />
            </div>
          </div>
          <TraderStats stats={data.stats} initialWindow={initialWindow} />
        </>
      )}
    </div>
  );
}
