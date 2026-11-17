"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFollow } from "@/hooks/use-follow";
import type { LeaderboardWindow } from "@/lib/api/client";
import { useLeaderboard } from "@/lib/api/queries";
import { formatCompactUsd, formatPct, formatUsd, shortAddress } from "@/lib/format";
import { solanaCluster } from "@/lib/solana/cluster";
import { cn } from "@/lib/utils";

const STICKY_RANK = "max-lg:sticky max-lg:left-0 max-lg:z-10 max-lg:w-12 max-lg:min-w-12 max-lg:bg-card";
const STICKY_TRADER = "max-lg:sticky max-lg:left-12 max-lg:z-10 max-lg:bg-card";

const WINDOWS = ["24h", "7d", "30d"] as const satisfies readonly LeaderboardWindow[];

function parseWindow(value: string | null): LeaderboardWindow {
  return WINDOWS.find((w) => w === value) ?? "7d";
}

export function LeaderboardView() {
  const router = useRouter();
  const pathname = usePathname();
  const window = parseWindow(useSearchParams().get("window"));
  const setWindow = (next: LeaderboardWindow) =>
    router.replace(`${pathname}?window=${next}`, { scroll: false });
  const { data, isPending, isError, refetch } = useLeaderboard(window);
  const auth = useAuth();
  const follow = useFollow();
  const explorer = data?.dataSource === "indexed" ? solanaCluster().explorerAddressUrl : undefined;
  return (
    <div className="mx-auto max-w-[1280px] space-y-4 px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl">Find your people. Study their process.</h1>
          <p className="mt-1 text-muted-foreground">
            Ranked by net PnL on supported spot trades, average-cost basis, net of known fees.{" "}
            {data?.dataSource === "demo"
              ? "Demo fixtures"
              : data?.dataSource === "indexed"
                ? "Indexed trades"
                : "Data source unavailable"}
            {isError ? "." : ", updated every 30s."}
          </p>
          {!auth.authenticated && (
            <p className="mt-1 text-muted-foreground text-sm">
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
          {WINDOWS.map((w) => (
            <ToggleGroupItem key={w} value={w} className="h-10 px-4 lg:h-8 lg:px-3">
              {w}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={cn("lg:w-16", STICKY_RANK)}>Rank</TableHead>
              <TableHead className={STICKY_TRADER}>Trader</TableHead>
              <TableHead className="text-right">Net PnL</TableHead>
              <TableHead className="text-right">Return</TableHead>
              <TableHead className="text-right">Volume</TableHead>
              <TableHead className="text-right">Trades</TableHead>
              <TableHead className="text-right">Win rate</TableHead>
              <TableHead>
                <span className="sr-only">Follow</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Loading rankings…
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Rankings unavailable.{" "}
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    Retry
                  </Button>
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
                    <span className="font-medium">{e.handle}</span>
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
