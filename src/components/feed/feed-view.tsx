"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Check,
  Heart,
  Loader2,
  MessageSquare,
  PenLine,
  Pin,
  Share2,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-context";
import { AssetAvatar } from "@/components/common/asset-avatar";
import { TraderLink } from "@/components/common/trader-link";
import { PositionReplayLink } from "@/components/social/position-replay-link";
import { type ActiveThesisThread, ThesisThreadSheet } from "@/components/social/thesis-thread-sheet";
import { TraderAvatar } from "@/components/social/trader-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFeed } from "@/hooks/use-feed";
import { useFollow } from "@/hooks/use-follow";
import { useNow } from "@/hooks/use-now";
import { usePostThesis, useReactToPost } from "@/hooks/use-social-actions";
import type { FeedItem, FeedScope, PostPosition } from "@/lib/api/client";
import { socialQueries, tokenQueries } from "@/lib/api/queries";
import { feedItemContent } from "@/lib/api/social";
import { formatUsd, timeAgo, utcTimestamp } from "@/lib/format";
import { type PositionTarget, positionUrl } from "@/lib/position-replay";
import { cn } from "@/lib/utils";
import { FeedHeading, FeedPostsSkeleton, FeedTradersSkeleton } from "./feed-loading";

type FeedKindFilter = "all" | "trade" | "thesis";
const MAX_THESIS = 3000;

function FeedThesisComposer() {
  const auth = useAuth();
  const { data: tokens = [] } = useQuery(tokenQueries.trending());
  const postThesis = usePostThesis();
  const [open, setOpen] = useState(false);
  const [selectedMint, setSelectedMint] = useState("");
  const [position, setPosition] = useState<PostPosition>("long");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const firstMint = tokens[0]?.mint ?? "";
  useEffect(() => {
    if (open && !selectedMint && firstMint) setSelectedMint(firstMint);
  }, [open, selectedMint, firstMint]);

  const mint = selectedMint;

  async function submit() {
    if (!auth.authenticated) {
      auth.login();
      return;
    }
    const body = draft.trim();
    if (!mint || !body) return;
    setError(null);
    try {
      await postThesis.mutateAsync({ mint, body, position });
      setDraft("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish thesis");
    }
  }

  if (!open) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3 text-muted-foreground text-sm">
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <PenLine className="size-3.5" />
          </span>
          <span>What&apos;s your thesis?</span>
        </div>
        <Button
          size="sm"
          onClick={() => {
            if (!selectedMint && firstMint) setSelectedMint(firstMint);
            setOpen(true);
          }}
        >
          Write thesis
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="feed-thesis-token">
          Token
        </label>
        <select
          id="feed-thesis-token"
          value={mint}
          onChange={(e) => setSelectedMint(e.target.value)}
          className="h-8 rounded-md border border-border bg-background px-2.5 text-foreground text-xs outline-none focus:ring-2 focus:ring-ring/60"
        >
          {tokens.map((t) => (
            <option key={t.mint} value={t.mint}>
              {t.symbol} — {t.name}
            </option>
          ))}
        </select>
        <fieldset aria-label="Position stance" className="flex items-center gap-1 border-0 p-0">
          {(
            [
              ["long", "Holding"],
              ["short", "Exited"],
              ["none", "Neutral"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={position === value}
              onClick={() => setPosition(value)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs transition-colors",
                position === value
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </fieldset>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="ml-auto text-muted-foreground text-xs hover:text-foreground"
        >
          Cancel
        </button>
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value.slice(0, MAX_THESIS))}
        placeholder="Share your conviction, entry context, and invalidation..."
        aria-label="Thesis"
        rows={3}
        className="w-full resize-none rounded-lg border border-border bg-background/60 p-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/60 pointer-coarse:text-base"
      />
      {error && (
        <p role="alert" className="text-negative text-xs">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between">
        <span className="tabular text-muted-foreground text-xs">
          {draft.length}/{MAX_THESIS}
        </span>
        <Button
          size="sm"
          disabled={postThesis.isPending || (auth.authenticated ? !draft.trim() || !mint : !auth.configured)}
          onClick={submit}
        >
          {postThesis.isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
          {auth.authenticated ? "Publish thesis" : "Sign in to publish"}
        </Button>
      </div>
    </div>
  );
}

function SidebarFollowButton({ wallet, isFollowing }: { wallet: string; isFollowing: boolean }) {
  const auth = useAuth();
  const follow = useFollow();
  if (auth.authenticated && auth.walletAddress === wallet) return null;
  return (
    <Button
      size="sm"
      variant={isFollowing ? "secondary" : "outline"}
      className="h-7 px-2.5 text-xs"
      disabled={follow.isPending || (!auth.authenticated && !auth.configured)}
      onClick={() => {
        if (!auth.authenticated) {
          auth.login();
          return;
        }
        follow.mutate({ wallet, isFollowing: !isFollowing });
      }}
    >
      {isFollowing ? "Following" : "Follow"}
    </Button>
  );
}

function FeedCard({
  item,
  now,
  onOpenThread,
  onLike,
  relatedThesisId,
}: {
  item: FeedItem;
  now: number | null;
  onOpenThread: (thread: ActiveThesisThread) => void;
  onLike: (item: Extract<FeedItem, { kind: "thesis" }>) => void;
  relatedThesisId?: string;
}) {
  const [copied, setCopied] = useState(false);
  const content = feedItemContent(item);
  const target: PositionTarget | null =
    item.kind === "trade" || item.kind === "thesis"
      ? {
          wallet: item.wallet,
          mint: item.mint,
          positionId: item.positionId ?? undefined,
          thesisId: item.kind === "thesis" ? item.thesisId : relatedThesisId,
          discussionKey: item.kind === "trade" && !relatedThesisId ? item.discussionKey : undefined,
          fillId: item.kind === "trade" && !item.positionId ? item.id : undefined,
        }
      : null;
  const attachmentClass =
    "mt-3 flex items-center justify-between gap-3 rounded-lg border border-border/80 bg-background/60 px-3.5 py-2.5 transition-colors hover:bg-secondary/60";
  const attachment = (
    <>
      <span className="flex min-w-0 items-center gap-2.5">
        <AssetAvatar imageUrl={item.imageUrl} className="size-7" />
        <span className="min-w-0">
          <span className="block truncate font-medium text-sm">{item.symbol}</span>
          <span className="tabular block text-muted-foreground text-xs">
            {item.kind === "trade"
              ? `${content.attachment} · ${item.source === "demo" ? "simulated" : "indexed"}`
              : content.attachment}
          </span>
        </span>
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
    </>
  );

  async function share() {
    try {
      const current = new URL(window.location.href);
      const url = target ? positionUrl(current, target) : new URL(`/traders/${item.wallet}`, current);
      await navigator.clipboard.writeText(url.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error(target ? "Couldn’t copy the replay link" : "Couldn’t copy the trader link");
    }
  }

  return (
    <article className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-border/80">
      <div className="flex items-start gap-3">
        <TraderAvatar handle={item.handle} avatarUrl={item.avatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <TraderLink wallet={item.wallet} handle={item.handle} className="font-medium text-sm" />
              <span className="text-muted-foreground text-xs">·</span>
              <span className={cn("font-medium text-xs", content.tone)}>
                {item.kind === "thesis"
                  ? item.position === "long"
                    ? "Thesis · Holding"
                    : item.position === "short"
                      ? "Thesis · Exited"
                      : "Thesis"
                  : content.label}
              </span>
              {item.kind === "thesis" && item.pinned && (
                <Badge variant="outline" className="h-5 border-primary/40 text-[10px] text-primary">
                  <Pin className="mr-0.5 size-2.5" />
                  Pinned
                </Badge>
              )}
            </div>
            <time
              dateTime={utcTimestamp(item.createdAt)}
              title={utcTimestamp(item.createdAt)}
              className="shrink-0 text-muted-foreground text-xs"
            >
              {now ? `${timeAgo(item.createdAt, now)} ago` : ""}
            </time>
          </div>

          {item.kind === "thesis" ? (
            <p className="mt-2 whitespace-pre-wrap text-foreground/95 text-sm leading-6">{item.body}</p>
          ) : item.kind === "trade" ? (
            <p className="mt-2 font-medium text-sm">
              <span className={item.side === "buy" ? "text-positive" : "text-negative"}>
                {item.side === "buy" ? "Bought" : "Sold"} {formatUsd(item.amountUsd)}
              </span>{" "}
              <span className="text-muted-foreground">of</span>{" "}
              <span className="text-foreground">{item.symbol}</span>
            </p>
          ) : item.kind === "multi-user" ? (
            <p className="mt-2 font-medium text-sm">
              <span className={item.side === "buy" ? "text-positive" : "text-negative"}>
                {item.traderCount} traders {item.side === "buy" ? "bought" : "sold"}{" "}
                {formatUsd(item.amountUsd)}
              </span>{" "}
              <span className="text-muted-foreground">of</span>{" "}
              <span className="text-foreground">{item.symbol}</span>
            </p>
          ) : item.kind === "milestone" ? (
            <p className="mt-2 font-medium text-sm">
              <span className={item.realizedPnlUsd >= 0 ? "text-positive" : "text-negative"}>
                {item.realizedPnlUsd >= 0 ? "+" : "-"}
                {formatUsd(Math.abs(item.realizedPnlUsd))} realized PnL
              </span>{" "}
              <span className="text-muted-foreground">on</span>{" "}
              <span className="text-foreground">{item.symbol}</span>
            </p>
          ) : (
            <p className="mt-2 font-medium text-sm text-foreground">
              Joined Agele trading <span className="text-primary">{item.symbol}</span>
            </p>
          )}

          {target ? (
            <PositionReplayLink
              target={target}
              aria-label={`Replay ${item.symbol} position`}
              className={cn(attachmentClass, "w-full text-left")}
            >
              {attachment}
            </PositionReplayLink>
          ) : (
            <Link href={`/trade/${item.mint}`} className={attachmentClass}>
              {attachment}
            </Link>
          )}

          <div className="mt-3 flex items-center gap-4 text-muted-foreground text-xs">
            {item.kind === "thesis" && (
              <>
                <button
                  type="button"
                  onClick={() => onLike(item)}
                  aria-pressed={Boolean(item.likedByMe)}
                  aria-label={item.likedByMe ? "Unlike thesis" : "Like thesis"}
                  className={cn(
                    "inline-flex items-center gap-1.5 transition-colors hover:text-foreground",
                    item.likedByMe && "text-primary",
                  )}
                >
                  <Heart className={cn("size-3.5", item.likedByMe && "fill-current")} />
                  <span className="tabular">{item.likes}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onOpenThread({
                      mint: item.mint,
                      thesisId: item.thesisId,
                      symbol: item.symbol,
                      imageUrl: item.imageUrl,
                    })
                  }
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                >
                  <MessageSquare className="size-3.5" />
                  <span className="tabular">{item.replyCount}</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={share}
              aria-label="Copy link"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
            >
              {copied ? <Check className="size-3.5 text-primary" /> : <Share2 className="size-3.5" />}
              <span>{copied ? "Copied" : "Share"}</span>
            </button>
            {item.kind === "thesis" && (
              <button
                type="button"
                onClick={() =>
                  onOpenThread({
                    mint: item.mint,
                    thesisId: item.thesisId,
                    symbol: item.symbol,
                    imageUrl: item.imageUrl,
                  })
                }
                className="ml-auto font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Open thread
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function FeedView() {
  const [scope, setScope] = useState<FeedScope>("global");
  const [kindFilter, setKindFilter] = useState<FeedKindFilter>("all");
  const [activeThread, setActiveThread] = useState<ActiveThesisThread | null>(null);
  const auth = useAuth();
  const now = useNow(30_000);
  const feed = useFeed(scope);
  const reactToPost = useReactToPost();
  const { data: board, isPending: boardPending } = useQuery(socialQueries.leaderboard("7d", auth));

  const allItems = feed.data?.pages.flatMap((page) => page.items) ?? [];
  const thesisIds = new Map(
    allItems.flatMap((item) =>
      item.kind === "thesis" ? [[`${item.wallet}:${item.mint}:${item.positionId}`, item.thesisId]] : [],
    ),
  );
  const items = allItems.filter((item) => {
    if (kindFilter === "all") return true;
    if (kindFilter === "thesis") return item.kind === "thesis";
    return item.kind !== "thesis";
  });
  const hasDemoItems = allItems.some((item) => item.source === "demo") || board?.dataSource === "demo";
  const needsAuth = scope === "following" && !auth.authenticated;
  const emptyFollowing =
    scope === "following" && auth.authenticated && !feed.isPending && !feed.isError && allItems.length === 0;

  function handleLike(item: Extract<FeedItem, { kind: "thesis" }>) {
    if (!auth.authenticated) {
      auth.login();
      return;
    }
    reactToPost.mutate({
      id: item.id,
      liked: !item.likedByMe,
      mint: item.mint,
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <FeedHeading />
        <div className="flex flex-wrap items-center gap-3">
          <fieldset
            aria-label="Feed scope"
            className="flex items-center gap-1 rounded-lg border border-border bg-card p-1"
          >
            {(["global", "following"] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={scope === s}
                onClick={() => setScope(s)}
                className={cn(
                  "rounded-md px-3 py-1 font-medium text-xs capitalize transition-colors",
                  scope === s
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </fieldset>
          <fieldset
            aria-label="Feed filter"
            className="flex items-center gap-1 rounded-lg border border-border bg-card p-1"
          >
            {(
              [
                ["all", "All"],
                ["trade", "Trades"],
                ["thesis", "Theses"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={kindFilter === value}
                onClick={() => setKindFilter(value)}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium text-xs transition-colors",
                  kindFilter === value
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </fieldset>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <FeedThesisComposer />

          {needsAuth ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center">
              <UserPlus className="size-8 text-muted-foreground" />
              <div className="space-y-1">
                <p className="font-medium text-sm">Sign in to see traders you follow</p>
                <p className="text-muted-foreground text-xs">
                  Your following feed combines trades and theses from accounts you track.
                </p>
              </div>
              <Button size="sm" disabled={!auth.configured} onClick={auth.login}>
                Sign in
              </Button>
            </div>
          ) : feed.isPending ? (
            <FeedPostsSkeleton />
          ) : feed.isError && allItems.length === 0 ? (
            <div role="alert" className="rounded-xl border border-border bg-card p-6 text-center">
              <p className="text-sm">{feed.error.message}</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => feed.refetch()}>
                Retry
              </Button>
            </div>
          ) : emptyFollowing ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center">
              <UserPlus className="size-8 text-muted-foreground" />
              <div className="space-y-1">
                <p className="font-medium text-sm">You aren&apos;t following any traders yet</p>
                <p className="text-muted-foreground text-xs">
                  Follow traders from the sidebar or leaderboard to populate this feed.
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/leaderboard">Browse leaderboard</Link>
              </Button>
            </div>
          ) : (
            <>
              {feed.isError && !feed.isFetchNextPageError && (
                <div
                  role="alert"
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-muted-foreground text-xs"
                >
                  <span>Couldn&apos;t update the feed.</span>
                  <Button size="sm" variant="outline" onClick={() => feed.refetch()}>
                    Retry
                  </Button>
                </div>
              )}
              {items.length === 0 ? (
                <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-muted-foreground text-sm">
                  {kindFilter === "all"
                    ? "No feed activity yet."
                    : `No ${kindFilter === "trade" ? "trades" : "theses"} in the loaded pages yet.`}
                </div>
              ) : (
                items.map((item) => (
                  <FeedCard
                    key={item.id}
                    item={item}
                    now={now}
                    onOpenThread={setActiveThread}
                    onLike={handleLike}
                    relatedThesisId={
                      item.kind === "trade" && item.positionId
                        ? thesisIds.get(`${item.wallet}:${item.mint}:${item.positionId}`)
                        : undefined
                    }
                  />
                ))
              )}
              {feed.isFetchingNextPage && <FeedPostsSkeleton />}
              {feed.isFetchNextPageError && (
                <div
                  role="alert"
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-muted-foreground text-xs"
                >
                  <span>Couldn&apos;t load more posts.</span>
                  <Button size="sm" variant="outline" onClick={() => feed.fetchNextPage()}>
                    Retry
                  </Button>
                </div>
              )}
              {feed.hasNextPage && !feed.isFetchNextPageError && (
                <div className="flex justify-center pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={feed.isFetchingNextPage}
                    onClick={() => feed.fetchNextPage()}
                  >
                    {feed.isFetchingNextPage ? "Loading…" : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <aside className="space-y-3">
          <div className="h-fit rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium text-sm">Traders to watch</h2>
              <span className="text-muted-foreground text-xs">7D</span>
            </div>
            {boardPending ? (
              <FeedTradersSkeleton />
            ) : (
              <ul className="divide-y divide-border/50">
                {(board?.entries ?? []).slice(0, 6).map((t) => (
                  <li key={t.wallet} className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0">
                    <TraderAvatar handle={t.handle} size="sm" />
                    <div className="min-w-0 flex-1">
                      <TraderLink
                        wallet={t.wallet}
                        handle={t.handle}
                        className="block truncate font-medium text-sm"
                      />
                      <div className="tabular text-xs">
                        <span className={t.pnlUsd >= 0 ? "text-positive" : "text-negative"}>
                          {t.pnlUsd > 0 ? `+${formatUsd(t.pnlUsd)}` : formatUsd(t.pnlUsd)}
                        </span>
                        <span className="text-muted-foreground"> · {t.winRatePct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <SidebarFollowButton wallet={t.wallet} isFollowing={Boolean(t.isFollowing)} />
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/leaderboard"
              className="mt-4 inline-flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
            >
              Explore traders
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          {hasDemoItems && (
            <p className="px-1 text-muted-foreground text-xs">Demo traders · simulated activity</p>
          )}
        </aside>
      </div>

      <ThesisThreadSheet
        thread={activeThread}
        onOpenChange={(open) => {
          if (!open) setActiveThread(null);
        }}
      />
    </div>
  );
}
