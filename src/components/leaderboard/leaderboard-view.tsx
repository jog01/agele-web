"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import { TraderLink } from "@/components/common/trader-link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFollow } from "@/hooks/use-follow";
import type { LeaderboardWindow } from "@/lib/api/client";
import { LEADERBOARD_WINDOWS, parseLeaderboardWindow } from "@/lib/api/leaderboard";
import { useLeaderboard } from "@/lib/api/queries";
import { formatCompactUsd, formatPct, formatUsd, shortAddress } from "@/lib/format";
import { solanaCluster } from "@/lib/solana/cluster";
import { cn } from "@/lib/utils";

const STICKY_RANK = "max-lg:sticky max-lg:left-0 max-lg:z-10 max-lg:w-12 max-lg:min-w-12 max-lg:bg-card";
const STICKY_TRADER = "max-lg:sticky max-lg:left-12 max-lg:z-10 max-lg:bg-card";
const PAGE = "mx-auto w-full min-w-0 max-w-[1280px] space-y-4 px-4 py-4 sm:px-6 sm:py-5";

function RankingTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className={cn("lg:w-16", STICKY_RANK)}>Rank</TableHead>
        <TableHead className={STICKY_TRADER}>Trader</TableHead>
        {["Net PnL", "Return", "Volume", "Trades", "Win rate"].map((label) => (
          <TableHead key={label} className="text-right">
            {label}
          </TableHead>
        ))}
        <TableHead>
          <span className="sr-only">Follow</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}

function RankingRowsSkeleton() {
  return [1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
    <TableRow key={row} aria-hidden className="h-12 sm:h-11">
      <TableCell className={STICKY_RANK}>
        <Skeleton className="h-3 w-4 motion-reduce:animate-none" />
      </TableCell>
      <TableCell className={STICKY_TRADER}>
        <div className="flex items-center gap-2">
          <Skeleton className="size-7 shrink-0 rounded-full motion-reduce:animate-none" />
          <Skeleton className="h-3 w-24 motion-reduce:animate-none" />
        </div>
      </TableCell>
      {[0, 1, 2, 3, 4, 5].map((cell) => (
        <TableCell key={cell}>
          <Skeleton className="ml-auto h-3 w-14 motion-reduce:animate-none" />
        </TableCell>
      ))}
    </TableRow>
  ));
}

export function LeaderboardLoading() {
  return (
    <div role="status" aria-label="Loading leaderboard" aria-busy="true" className={PAGE}>
      <span className="sr-only">Loading leaderboard</span>
      <div aria-hidden className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-semibold text-xl">Leaderboard</h1>
            <p className="mt-1 text-muted-foreground text-sm">Find your people. Study their process.</p>
          </div>
          <Skeleton className="h-10 w-40 motion-reduce:animate-none lg:h-8" />
        </div>
        <div className="overflow-hidden rounded-md border bg-card">
          <div className="flex h-10 items-center gap-3 border-b px-3">
            <Skeleton className="h-3 w-24 motion-reduce:animate-none" />
            <Skeleton className="h-3 w-40 motion-reduce:animate-none" />
          </div>
          <Table>
            <RankingTableHeader />
            <TableBody>
              <RankingRowsSkeleton />
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export function LeaderboardView() {
  const router = useRouter();
  const pathname = usePathname();
  const window = parseLeaderboardWindow(useSearchParams().get("window"));
  const setWindow = (next: LeaderboardWindow) =>
    router.replace(`${pathname}?window=${next}`, { scroll: false });
  const { data, isPending, isError, isFetching, refetch } = useLeaderboard(window);
  const auth = useAuth();
  const follow = useFollow();
  const explorer = data?.dataSource === "indexed" ? solanaCluster().explorerAddressUrl : undefined;
  return (
    <div className={PAGE}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-semibold text-xl">Leaderboard</h1>
          <p className="mt-1 text-muted-foreground text-sm">Find your people. Study their process.</p>
          {!auth.authenticated && (
            <p className="mt-1 text-muted-foreground text-xs">
              {auth.configured
                ? "Sign in to follow traders."
                : "Sign-in is not configured in this build, so following is disabled."}
            </p>
          )}
          {follow.isError && (
            <p role="alert" className="mt-1 text-muted-foreground text-sm">
              {follow.error.message}
            </p>
          )}
        </div>
        <ToggleGroup
          type="single"
          value={window}
          onValueChange={(v) => v && setWindow(v as LeaderboardWindow)}
          variant="outline"
          aria-label="Ranking window"
        >
          {LEADERBOARD_WINDOWS.map((w) => (
            <ToggleGroupItem key={w} value={w} className="h-10 px-4 lg:h-8 lg:px-3">
              {w}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="overflow-hidden rounded-md border bg-card" aria-busy={isPending || isFetching}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2 text-xs">
          <span className="rounded border bg-secondary px-1.5 py-0.5 font-medium text-primary">
            {data?.dataSource === "demo"
              ? "Demo fixtures"
              : data?.dataSource === "indexed"
                ? "Indexed trades"
                : isPending
                  ? "Loading"
                  : "Source unavailable"}
          </span>
          <p className="text-muted-foreground">
            Net PnL · supported spot trades · average-cost basis · net of known fees · updates every 30s
          </p>
          {isPending ? (
            <span role="status" className="sr-only">
              Loading rankings
            </span>
          ) : isFetching ? (
            <span role="status" className="text-muted-foreground">
              Updating rankings…
            </span>
          ) : null}
        </div>
        <Table aria-label="Trader rankings">
          <RankingTableHeader />
          <TableBody>
            {isPending && <RankingRowsSkeleton />}
            {isError && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  <span role="alert">
                    {data
                      ? "Could not refresh rankings. Showing the last snapshot."
                      : "Rankings unavailable."}
                  </span>{" "}
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    Retry
                  </Button>
                </TableCell>
              </TableRow>
            )}
            {!isPending && !isError && data?.entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  <p className="font-medium text-foreground">No rankings yet</p>
                  <p className="mt-1 text-xs">Rankings have not been published for this window.</p>
                </TableCell>
              </TableRow>
            )}
            {data?.entries.map((e) => (
              <TableRow key={e.wallet} className="h-11">
                <TableCell className={cn("tabular text-muted-foreground", STICKY_RANK)}>{e.rank}</TableCell>
                <TableCell className={STICKY_TRADER}>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-7 items-center justify-center rounded-full bg-secondary font-semibold text-[11px] text-primary">
                      {e.handle.slice(0, 2).toUpperCase()}
                    </span>
                    <TraderLink wallet={e.wallet} handle={e.handle} window={window} />
                    {explorer ? (
                      <a
                        href={explorer(e.wallet)}
                        target="_blank"
                        rel="noreferrer"
                        className="hidden font-mono text-muted-foreground text-xs hover:text-foreground hover:underline sm:inline"
                      >
                        {shortAddress(e.wallet)}
                      </a>
                    ) : (
                      <span className="hidden font-mono text-muted-foreground text-xs sm:inline">
                        {shortAddress(e.wallet)}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell
                  className={cn("tabular text-right", e.pnlUsd >= 0 ? "text-positive" : "text-negative")}
                >
                  {e.pnlUsd >= 0 ? "+" : ""}
                  {formatUsd(e.pnlUsd)}
                </TableCell>
                <TableCell
                  className={cn("tabular text-right", e.pnlPct >= 0 ? "text-positive" : "text-negative")}
                >
                  {formatPct(e.pnlPct)}
                </TableCell>
                <TableCell className="tabular text-right">{formatCompactUsd(e.volumeUsd)}</TableCell>
                <TableCell className="tabular text-right">{e.trades}</TableCell>
                <TableCell className="tabular text-right">
                  {formatPct(e.winRatePct, { signed: false })}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`${e.isFollowing ? "Unfollow" : "Follow"} ${e.handle}`}
                    disabled={!auth.authenticated || follow.isPending || e.wallet === auth.walletAddress}
                    onClick={() => follow.mutate({ wallet: e.wallet, isFollowing: !e.isFollowing })}
                  >
                    {e.isFollowing ? "Unfollow" : "Follow"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
