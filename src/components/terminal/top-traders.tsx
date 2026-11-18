"use client";

import Link from "next/link";
import { TraderLink } from "@/components/common/trader-link";
import { useLeaderboard } from "@/lib/api/queries";
import { formatCompactUsd } from "@/lib/format";
import { TableSkeleton } from "./panel-skeleton";

export function TopTraders() {
  const { data, isPending, isError, refetch } = useLeaderboard("24h");
  if (isPending) return <TableSkeleton label="Loading top traders" columns={3} />;
  if (isError)
    return (
      <p className="p-3 text-muted-foreground">
        Top traders unavailable.{" "}
        <button type="button" className="text-primary underline" onClick={() => void refetch()}>
          Retry
        </button>
      </p>
    );
  return (
    <section aria-label="Top traders" className="bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
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
          <li key={e.wallet} className="flex min-h-9 items-center gap-2">
            <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-[10px] text-muted-foreground">
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
