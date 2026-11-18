"use client";

import { ArrowUpRight, MessageSquareText, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { AssetAvatar } from "@/components/common/asset-avatar";
import { TraderLink } from "@/components/common/trader-link";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFeed } from "@/hooks/use-feed";
import { useFollow } from "@/hooks/use-follow";
import { useNow } from "@/hooks/use-now";
import type { FeedScope } from "@/lib/api/client";
import { useLeaderboard, useTrending } from "@/lib/api/queries";
import { feedItemContent } from "@/lib/api/social";
import { formatCompactUsd, shortAddress, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FEED_CARD, FEED_FRAME, FeedHeading, FeedPostsSkeleton, FeedTradersSkeleton } from "./feed-loading";

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
  const {
    data: board,
    isPending: boardPending,
    isError: boardError,
    refetch: refetchBoard,
  } = useLeaderboard("7d");

  const posts = (feed.data?.pages.flatMap((page) => page.items) ?? []).map((item) => ({
    ...item,
    content: feedItemContent(item),
    token: tokens.find((token) => token.mint === item.mint) ?? {
      mint: item.mint,
      symbol: shortAddress(item.mint),
    },
  }));

  return (
    <div className={FEED_FRAME}>
      <FeedHeading />
      <div className="min-w-0 space-y-3 lg:col-start-1 lg:row-start-2">
        <ToggleGroup
          type="single"
          value={scope}
          onValueChange={(v) => v && setScope(v as FeedScope)}
          variant="outline"
          aria-label="Feed scope"
        >
          {(["global", "following"] as const).map((value) => (
            <ToggleGroupItem key={value} value={value} className="h-11 px-4 text-xs lg:h-10">
              {value === "global" ? "Global" : "Following"}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {scope === "following" && !auth.authenticated ? (
          <div className={cn(FEED_CARD, "space-y-3 py-8 sm:py-10")}>
            <Users aria-hidden className="size-5 text-muted-foreground" />
            <h2 className="font-medium text-sm">Your people, your feed</h2>
            <p className="text-muted-foreground text-sm">
              Follow traders to collect their ideas and trades here.
            </p>
            <Button variant="outline" disabled={!auth.configured || !auth.ready} onClick={auth.login}>
              Sign in to see your following feed
            </Button>
            {!auth.configured && (
              <p className="text-muted-foreground text-sm">Sign-in is not configured in this build.</p>
            )}
          </div>
        ) : (
          <>
            {feed.isPending && <FeedPostsSkeleton />}
            {feed.isError && (
              <div
                role="alert"
                className={cn(
                  FEED_CARD,
                  "flex flex-wrap items-center justify-between gap-3 text-muted-foreground text-sm",
                )}
              >
                <p>
                  {feed.isFetchNextPageError
                    ? "Couldn’t load more posts."
                    : posts.length
                      ? "Couldn’t update the feed."
                      : "Feed unavailable."}{" "}
                  {feed.error.message}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={feed.isFetching}
                  onClick={() => (feed.isFetchNextPageError ? feed.fetchNextPage() : feed.refetch())}
                >
                  Retry
                </Button>
              </div>
            )}
            {!feed.isPending && !feed.isError && posts.length === 0 && (
              <div className={cn(FEED_CARD, "space-y-2 py-10 sm:py-12")}>
                <MessageSquareText aria-hidden className="mb-3 size-5 text-muted-foreground" />
                <h2 className="font-medium text-sm">No posts yet.</h2>
                <p className="text-muted-foreground text-sm">
                  {scope === "following"
                    ? "Ideas from traders you follow will appear here."
                    : "Market ideas and trades will appear here as traders share them."}
                </p>
                <Link
                  href="/leaderboard"
                  className="inline-flex min-h-11 items-center gap-1 text-primary text-sm hover:underline focus-visible:outline-2 focus-visible:outline-foreground"
                >
                  Discover traders <ArrowUpRight aria-hidden className="size-3.5" />
                </Link>
              </div>
            )}
            {posts.map((p) => (
              <article key={p.id} className={FEED_CARD}>
                <header className="flex items-start gap-3">
                  <Initials handle={p.handle} />
                  <div className="min-w-0 flex-1">
                    <TraderLink wallet={p.wallet} handle={p.handle} className="block truncate text-[13px]" />
                    <div className={cn("text-xs", p.content.tone)}>
                      {p.kind === "trade"
                        ? p.content.label
                        : p.position === "long"
                          ? "Thesis · holding"
                          : p.position === "short"
                            ? "Thesis · exited"
                            : "Thesis"}
                    </div>
                  </div>
                  <time
                    dateTime={new Date(p.createdAt * 1000).toISOString()}
                    className="tabular shrink-0 pt-0.5 text-[11px] text-muted-foreground"
                  >
                    {now ? timeAgo(p.createdAt, now) : ""}
                  </time>
                </header>
                <p className="mt-3 min-h-12 wrap-anywhere text-[13px] leading-6">
                  {p.content.body ?? p.content.attachment}
                </p>
                <Link
                  href={`/trade/${p.token.mint}`}
                  className="mt-3 flex min-h-[66px] items-center gap-3 rounded-md border border-border/50 bg-background px-3 py-2.5 transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-foreground"
                >
                  <AssetAvatar mint={p.token.mint} symbol={p.token.symbol} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-xs">{p.token.symbol}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {p.kind === "thesis" ? p.content.attachment : "Execution · demo data"}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-[11px] text-primary">
                    View market <ArrowUpRight aria-hidden className="size-3" />
                  </span>
                </Link>
              </article>
            ))}
            {feed.isFetchingNextPage && <FeedPostsSkeleton count={1} />}
            {feed.hasNextPage && !feed.isFetchNextPageError && (
              <Button
                variant="outline"
                disabled={feed.isFetchingNextPage}
                onClick={() => feed.fetchNextPage()}
              >
                {feed.isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            )}
            {!feed.isError && !feed.hasNextPage && posts.length > 0 && (
              <p className="py-2 text-center text-muted-foreground text-sm">You're all caught up.</p>
            )}
          </>
        )}
      </div>
      <aside className="min-w-0 self-start lg:col-start-2 lg:row-start-2">
        <section className="rounded-md border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-medium text-sm">Traders to watch</h2>
            <span className="text-[10px] text-muted-foreground">7D</span>
          </div>
          <p className="mt-1 mb-2 text-muted-foreground text-xs">
            {board?.dataSource === "demo" ? "Demo leaderboard" : "7-day leaderboard"}
          </p>
          {boardPending && <FeedTradersSkeleton />}
          {boardError && (
            <p role="alert" className="mt-3 text-muted-foreground text-sm">
              Traders unavailable.{" "}
              <Button variant="outline" size="sm" onClick={() => refetchBoard()}>
                Retry
              </Button>
            </p>
          )}
          <ul className="divide-y">
            {board?.entries.slice(0, 4).map((e) => (
              <li key={e.wallet} className="flex min-h-[68px] items-center gap-2.5 py-2">
                <Initials handle={e.handle} />
                <div className="min-w-0 flex-1">
                  <TraderLink wallet={e.wallet} handle={e.handle} className="block truncate text-[13px]" />
                  <div className="tabular truncate text-[10px] text-muted-foreground">
                    {e.trades} trades · {formatCompactUsd(e.volumeUsd)} volume
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-10 min-w-14 px-2 text-[11px] pointer-coarse:min-h-11"
                  disabled={!auth.authenticated || follow.isPending || e.wallet === auth.walletAddress}
                  onClick={() => follow.mutate({ wallet: e.wallet, isFollowing: !e.isFollowing })}
                >
                  {e.isFollowing ? "Unfollow" : "Follow"}
                </Button>
              </li>
            ))}
          </ul>
          {!boardPending && !boardError && !board?.entries.length && (
            <p className="py-5 text-muted-foreground text-xs">No ranked traders yet.</p>
          )}
          {!auth.authenticated && !boardError && (
            <p className="mt-3 text-muted-foreground text-xs">
              {auth.configured
                ? "Sign in to follow traders."
                : "Sign-in is not configured in this build, so following is disabled."}
            </p>
          )}
          {follow.isError && (
            <p role="alert" className="text-muted-foreground text-xs">
              {follow.error.message}
            </p>
          )}
          <Link
            href="/leaderboard"
            className="mt-3 flex min-h-10 items-center justify-between border-t pt-2 text-primary text-xs hover:underline focus-visible:outline-2 focus-visible:outline-foreground"
          >
            View leaderboard <ArrowUpRight aria-hidden className="size-3.5" />
          </Link>
        </section>
      </aside>
    </div>
  );
}
