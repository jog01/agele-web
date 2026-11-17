"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { LeaderboardWindow } from "@/lib/api/client";
import { useLeaderboard } from "@/lib/api/queries";
import { formatCompactUsd, formatPct, formatUsd, shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";

export function LeaderboardView() {
  const [window, setWindow] = useState<LeaderboardWindow>("7d");
  const { data, isPending, isError } = useLeaderboard(window);
  return (
    <div className="mx-auto max-w-[1280px] space-y-4 px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl">Find your people. Study their process.</h1>
          <p className="mt-1 text-muted-foreground">
            Ranked by net PnL on supported spot trades, average-cost basis, net of known fees. Demo fixtures,
            updated every 30s.
          </p>
        </div>
        <ToggleGroup
          type="single"
          value={window}
          onValueChange={(v) => v && setWindow(v as LeaderboardWindow)}
          variant="outline"
          aria-label="Ranking window"
        >
          {(["24h", "7d", "30d"] as const).map((w) => (
            <ToggleGroupItem key={w} value={w} className="px-3">
              {w}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead>Trader</TableHead>
              <TableHead className="text-right">Net PnL</TableHead>
              <TableHead className="text-right">Return</TableHead>
              <TableHead className="text-right">Volume</TableHead>
              <TableHead className="text-right">Trades</TableHead>
              <TableHead className="text-right">Win rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Loading rankings…
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Rankings unavailable.
                </TableCell>
              </TableRow>
            )}
            {data?.entries.map((e) => (
              <TableRow key={e.wallet} className="h-11">
                <TableCell className="tabular text-muted-foreground">{e.rank}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-7 items-center justify-center rounded-full bg-secondary font-semibold text-[11px] text-primary">
                      {e.handle.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="font-medium">{e.handle}</span>
                    <span className="font-mono text-muted-foreground text-xs">{shortAddress(e.wallet)}</span>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
