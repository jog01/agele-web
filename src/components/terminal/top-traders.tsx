"use client";

import Link from "next/link";
import { TraderLink } from "@/components/common/trader-link";
import { useLeaderboard } from "@/lib/api/queries";
import { formatCompactUsd } from "@/lib/format";

export function TopTraders() {
  const { data } = useLeaderboard("24h");
  return (
    <section aria-label="Top traders" className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold text-[15px]">Top traders · 24h</h2>
        <Link href="/leaderboard?window=24h" className="text-primary text-xs hover:underline">
          View all
        </Link>
      </div>
      {data?.dataSource === "demo" && (
        <p className="-mt-1 mb-2 text-muted-foreground text-xs">Demo fixtures</p>
      )}
      <ul className="space-y-2">
        {data?.entries.slice(0, 4).map((e) => (
          <li key={e.wallet} className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-secondary font-semibold text-[11px] text-primary">
              {e.handle.slice(0, 2).toUpperCase()}
            </span>
            <TraderLink wallet={e.wallet} handle={e.handle} className="min-w-0 flex-1 truncate" />
            <span className={`tabular text-xs ${e.pnlUsd >= 0 ? "text-positive" : "text-negative"}`}>
              {e.pnlUsd >= 0 ? "+" : ""}
              {formatCompactUsd(e.pnlUsd)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
