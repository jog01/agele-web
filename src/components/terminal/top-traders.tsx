"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { socialQueries } from "@/lib/api/queries";
import { formatCompactUsd } from "@/lib/format";

export function TopTraders() {
  const { data } = useQuery(socialQueries.leaderboard("24h"));
  return (
    <section aria-label="Top traders" className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold text-[15px]">Top traders · 24h</h2>
        <Link href="/leaderboard" className="text-primary text-xs hover:underline">
          View all
        </Link>
      </div>
      <ul className="space-y-2">
        {data?.entries.slice(0, 4).map((e) => (
          <li key={e.wallet} className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-secondary font-semibold text-[11px] text-primary">
              {e.handle.slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate">{e.handle}</span>
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
