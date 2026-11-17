"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { AssetAvatar } from "@/components/common/asset-avatar";
import { Button } from "@/components/ui/button";
import { useFeed } from "@/hooks/use-feed";
import { useFollow } from "@/hooks/use-follow";
import { useNow } from "@/hooks/use-now";
import type { FeedScope } from "@/lib/api/client";
import { useLeaderboard, useTrending } from "@/lib/api/queries";
import { feedItemContent } from "@/lib/api/social";
import { formatCompactUsd, shortAddress, timeAgo } from "@/lib/format";
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
  const [scope, setScope] = useState<FeedScope>("global");
  const feed = useFeed(scope);
  const follow = useFollow();
  const { data: board } = useLeaderboard("7d");

  const posts = (feed.data?.pages.flatMap((page) => page.items) ?? []).map((item) => ({
    ...item,
    content: feedItemContent(item),
    token: tokens.find((token) => token.mint === item.mint) ?? {
      mint: item.mint,
      symbol: shortAddress(item.mint),
    },
  }));

  return (
    <div className="mx-auto grid max-w-[1280px] gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-3">
        <div>
          <h1 className="font-semibold text-2xl">Your network.</h1>
          <p className="mt-1 text-muted-foreground">
            Demo feed · Theses and trades from traders across supported markets. Following feed unlocks after
            sign-in.
          </p>
        </div>
        <div>
          {(["global", "following"] as const).map((value) => (
            <Button
              key={value}
              variant="outline"
              size="sm"
              aria-pressed={scope === value}
              onClick={() => setScope(value)}
            >
              {value === "global" ? "Global" : "Following"}
            </Button>
          ))}
        </div>
        {scope === "following" && !auth.authenticated ? (
          <Button variant="outline" disabled={!auth.configured || !auth.ready} onClick={auth.login}>
            Sign in to see your following feed
          </Button>
        ) : (
          <>
            {feed.isPending && <p className="text-muted-foreground">Loading feed…</p>}
            {feed.isError && (
              <p role="alert" className="text-muted-foreground">
                Feed unavailable. {feed.error.message}{" "}
                <Button variant="outline" size="sm" onClick={() => feed.refetch()}>
                  Retry
                </Button>
              </p>
            )}
            {!feed.isPending && !feed.isError && posts.length === 0 && (
              <p className="text-muted-foreground">No posts yet.</p>
            )}
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
                      {p.kind === "trade"
                        ? p.content.label
                        : p.position === "long"
                          ? "Thesis · holding"
                          : p.position === "short"
                            ? "Thesis · exited"
                            : "Thesis"}
                    </div>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {now ? timeAgo(p.createdAt, now) : ""}
                  </span>
                </header>
                <p className="mt-3">{p.content.body ?? p.content.attachment}</p>
                <Link
                  href={`/trade/${p.token.mint}`}
                  className="mt-3 flex items-center gap-3 rounded-md bg-background p-3 hover:bg-surface-hover"
                >
                  <AssetAvatar symbol={p.token.symbol} />
                  <span className="flex-1">
                    <span className="block font-medium">{p.token.symbol}</span>
                    <span className="block text-muted-foreground text-xs">
                      {p.kind === "thesis" ? p.content.attachment : "Execution · demo data"}
                    </span>
                  </span>
                  <span className="text-primary text-xs">View market</span>
                </Link>
              </article>
            ))}
            {feed.hasNextPage && (
              <Button
                variant="outline"
                disabled={feed.isFetchingNextPage}
                onClick={() => feed.fetchNextPage()}
              >
                {feed.isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            )}
          </>
        )}
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
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!auth.authenticated || follow.isPending || e.wallet === auth.walletAddress}
                  onClick={() => follow.mutate({ wallet: e.wallet, isFollowing: !e.isFollowing })}
                >
                  {e.isFollowing ? "Unfollow" : "Follow"}
                </Button>
              </li>
            ))}
          </ul>
          {follow.isError && (
            <p role="alert" className="text-muted-foreground text-xs">
              {follow.error.message}
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}
