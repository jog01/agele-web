"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-context";
import { AssetAvatar } from "@/components/common/asset-avatar";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/use-now";
import { socialQueries, tokenQueries, useTrending } from "@/lib/api/queries";
import { formatCompactUsd, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

function Initials({ handle }: { handle: string }) {
  return (
    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-primary text-xs">
      {handle.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function FeedView() {
  const auth = useAuth();
  const now = useNow(30_000);
  const { data: tokens = [] } = useTrending();
  const top = tokens.slice(0, 3);
  const commentQueries = useQueries({ queries: top.map((t) => tokenQueries.comments(t.mint)) });
  const { data: board } = useQuery(socialQueries.leaderboard("7d"));

  const posts = commentQueries
    .flatMap((q, i) => (q.data ?? []).map((c) => ({ ...c, token: top[i] })))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 12);

  return (
    <div className="mx-auto grid max-w-[1280px] gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-3">
        <div>
          <h1 className="font-semibold text-2xl">Your network.</h1>
          <p className="mt-1 text-muted-foreground">
            Theses and trades from traders across supported markets. Following feed unlocks after sign-in.
          </p>
        </div>
        {posts.length === 0 && <p className="text-muted-foreground">Loading feed…</p>}
        {posts.map((p) => (
          <article key={p.id} className="rounded-lg border bg-card p-4">
            <header className="flex items-start gap-3">
              <Initials handle={p.handle} />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{p.handle}</div>
                <div
                  className={cn(
                    "text-xs",
                    p.position === "long"
                      ? "text-positive"
                      : p.position === "short"
                        ? "text-negative"
                        : "text-primary",
                  )}
                >
                  {p.position === "long"
                    ? "Thesis · holding"
                    : p.position === "short"
                      ? "Thesis · exited"
                      : "Thesis"}
                </div>
              </div>
              <span className="text-muted-foreground text-xs">{now ? timeAgo(p.createdAt, now) : ""}</span>
            </header>
            <p className="mt-3">{p.body}</p>
            <Link
              href={`/trade/${p.token.mint}`}
              className="mt-3 flex items-center gap-3 rounded-md bg-background p-3 hover:bg-surface-hover"
            >
              <AssetAvatar symbol={p.token.symbol} />
              <span className="flex-1">
                <span className="block font-medium">{p.token.symbol}</span>
                <span className="block text-muted-foreground text-xs">Opinion · no execution attached</span>
              </span>
              <span className="text-primary text-xs">View market</span>
            </Link>
          </article>
        ))}
      </div>
      <aside className="space-y-3 lg:pt-16">
        <section className="rounded-lg border bg-card p-4">
          <h2 className="font-semibold text-[15px]">Worth a closer look</h2>
          <p className="mt-1 text-muted-foreground text-xs">Discover traders by process, not hype.</p>
          <ul className="mt-3 space-y-3">
            {board?.entries.slice(0, 4).map((e) => (
              <li key={e.wallet} className="flex items-center gap-3">
                <Initials handle={e.handle} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{e.handle}</div>
                  <div className="text-muted-foreground text-xs">
                    {e.trades} trades · {formatCompactUsd(e.volumeUsd)} volume
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled={!auth.authenticated}>
                  Follow
                </Button>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
