"use client";

import Link from "next/link";
import { TraderLink } from "@/components/common/trader-link";
import { useLeaderboard } from "@/lib/api/queries";
import { formatCompactUsd } from "@/lib/format";

export function TopTraders() {
  const { data } = useLeaderboard("24h");
  return (
    <section aria-label="Top traders" className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold text-sm">
          Top traders <span className="font-normal text-muted-foreground">24h</span>
        </h2>
        <Link href="/leaderboard?window=24h" className="text-primary text-xs hover:underline">
          View all
        </Link>
      </div>
      {data?.dataSource === "demo" && (
        <p className="-mt-1 mb-2 text-muted-foreground text-xs">Demo fixtures</p>
      )}
      <ul className="divide-y divide-border/50">
        {data?.entries.slice(0, 4).map((e) => (
          <li key={e.wallet} className="flex min-h-12 items-center gap-3">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-[11px] text-muted-foreground">
              {e.handle.slice(0, 2).toUpperCase()}
            </span>
            <TraderLink
              wallet={e.wallet}
              handle={e.handle}
              window="24h"
              className="min-w-0 flex-1 truncate"
            />
            <span
              className={`tabular font-mono text-xs ${e.pnlUsd >= 0 ? "text-positive" : "text-negative"}`}
            >
              {e.pnlUsd >= 0 ? "+" : ""}
              {formatCompactUsd(e.pnlUsd)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
