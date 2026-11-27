"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowUpRight, CornerDownRight, Heart, Loader2, Pin, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { AssetAvatar } from "@/components/common/asset-avatar";
import { TraderLink } from "@/components/common/trader-link";
import { TableSkeleton } from "@/components/terminal/panel-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useNow } from "@/hooks/use-now";
import { usePinThesisVersion, usePostComment, useReactToPost } from "@/hooks/use-social-actions";
import type { Comment } from "@/lib/api/client";
import { thesisThreadQuery } from "@/lib/api/social";
import { timeAgo, utcTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TraderAvatar } from "./trader-avatar";

const MAX_COMMENT = 200;

export interface ActiveThesisThread {
  mint: string;
  thesisId: string;
  symbol?: string;
  imageUrl?: string | null;
}

export function ThesisThreadSheet({
  thread,
  onOpenChange,
}: {
  thread: ActiveThesisThread | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={Boolean(thread)} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        {thread ? <ThesisThreadBody key={`${thread.mint}:${thread.thesisId}`} thread={thread} /> : null}
      </SheetContent>
    </Sheet>
  );
}

export function ThesisThreadBody({
  thread,
  embedded = false,
}: {
  thread: ActiveThesisThread;
  embedded?: boolean;
}) {
  const auth = useAuth();
  const now = useNow(30_000);
  const [replyTarget, setReplyTarget] = useState<{ id: string; handle: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const query = useInfiniteQuery(thesisThreadQuery(thread.mint, thread.thesisId, auth));
  const postComment = usePostComment();
  const reactToPost = useReactToPost();
  const pinThesis = usePinThesisVersion();

  const pages = query.data?.pages ?? [];
  const pinned = pages[0]?.pinned ?? null;
  const comments = pages.flatMap((page) => page.comments);
  const rootPost = pinned ?? comments.find((c) => c.kind === "thesis") ?? comments[0] ?? null;
  const activeParentId = replyTarget?.id ?? rootPost?.id;

  const byParent = new Map<string, Comment[]>();
  const topLevel: Comment[] = [];
  const topIds = new Set<string>();
  for (const comment of comments) {
    if (pinned && comment.id === pinned.id) continue;
    if (comment.kind === "thesis" || !comment.parentId || comment.parentId === rootPost?.id) {
      topLevel.push(comment);
      topIds.add(comment.id);
    } else {
      const list = byParent.get(comment.parentId) ?? [];
      list.push(comment);
      byParent.set(comment.parentId, list);
    }
  }
  for (const [parentId, children] of byParent) {
    if (!topIds.has(parentId)) {
      topLevel.push(...children);
      byParent.delete(parentId);
    }
  }

  async function submitReply() {
    if (!auth.authenticated) {
      auth.login();
      return;
    }
    const body = draft.trim();
    if (!body || !activeParentId) return;
    setActionError(null);
    try {
      await postComment.mutateAsync({
        mint: thread.mint,
        body,
        parentId: activeParentId,
      });
      setDraft("");
      setReplyTarget(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not post reply");
    }
  }

  async function toggleLike(post: Comment) {
    if (!auth.authenticated) {
      auth.login();
      return;
    }
    setActionError(null);
    try {
      await reactToPost.mutateAsync({
        id: post.id,
        liked: !post.likedByMe,
        mint: thread?.mint,
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not update reaction");
    }
  }

  async function togglePin(post: Comment) {
    if (!thread) return;
    setActionError(null);
    try {
      await pinThesis.mutateAsync({
        id: post.id,
        pinned: !post.pinned,
        mint: thread.mint,
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not update pin");
    }
  }

  function renderPost(post: Comment, opts?: { highlight?: boolean; nested?: boolean }) {
    const canPin =
      post.kind === "thesis" && Boolean(auth.walletAddress && post.wallet === auth.walletAddress);
    return (
      <div
        key={post.id}
        className={cn(
          "rounded-lg border p-3.5 transition-colors",
          opts?.highlight ? "border-primary/40 bg-primary/5" : "border-border bg-card/60",
          opts?.nested && "ml-6 border-border/70 bg-background/60",
        )}
      >
        <div className="flex items-start gap-2.5">
          <TraderAvatar handle={post.handle} avatarUrl={post.avatarUrl} size="sm" className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {post.wallet ? (
                <TraderLink
                  wallet={post.wallet}
                  handle={post.handle}
                  className="font-medium text-foreground"
                />
              ) : (
                <span className="font-medium text-foreground">@{post.handle}</span>
              )}
              {post.kind === "thesis" && (
                <Badge variant="outline" className="h-5 border-border/80 text-[10px] text-muted-foreground">
                  Thesis
                </Badge>
              )}
              {post.position !== "none" && (
                <Badge
                  variant="outline"
                  className={cn(
                    "h-5 text-[10px]",
                    post.position === "long"
                      ? "border-positive/40 text-positive"
                      : "border-negative/40 text-negative",
                  )}
                >
                  {post.position === "long" ? "Holding" : "Exited"}
                </Badge>
              )}
              {post.pinned && (
                <Badge variant="outline" className="h-5 border-primary/40 text-[10px] text-primary">
                  <Pin className="mr-0.5 size-2.5" />
                  Pinned
                </Badge>
              )}
              <span className="ml-auto text-muted-foreground" title={utcTimestamp(post.createdAt)}>
                {now ? `${timeAgo(post.createdAt, now)} ago` : ""}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-foreground/95 text-sm leading-6">{post.body}</p>
            <div className="mt-2.5 flex items-center gap-3 text-muted-foreground text-xs">
              <button
                type="button"
                onClick={() => toggleLike(post)}
                aria-pressed={Boolean(post.likedByMe)}
                aria-label={post.likedByMe ? "Unlike post" : "Like post"}
                className={cn(
                  "inline-flex items-center gap-1 transition-colors hover:text-foreground",
                  post.likedByMe && "text-primary",
                )}
              >
                <Heart className={cn("size-3.5", post.likedByMe && "fill-current")} />
                <span className="tabular">{post.likes}</span>
              </button>
              <button
                type="button"
                onClick={() => setReplyTarget({ id: post.id, handle: post.handle })}
                className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
              >
                <CornerDownRight className="size-3.5" />
                Reply
              </button>
              {canPin && (
                <button
                  type="button"
                  onClick={() => togglePin(post)}
                  disabled={pinThesis.isPending}
                  className="ml-auto inline-flex items-center gap-1 transition-colors hover:text-foreground disabled:opacity-50"
                >
                  <Pin className="size-3" />
                  {post.pinned ? "Unpin" : "Pin"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {!embedded && (
        <SheetHeader className="border-b px-5 py-4">
          <div className="flex items-center gap-2.5 pr-8">
            <AssetAvatar imageUrl={thread.imageUrl} className="size-7" />
            <div className="min-w-0">
              <SheetTitle className="truncate text-sm">
                {thread.symbol ? `${thread.symbol} thesis thread` : "Thesis thread"}
              </SheetTitle>
              <SheetDescription className="text-xs">Versions, pinned update, and replies</SheetDescription>
            </div>
            <Link
              href={`/trade/${thread.mint}`}
              className="ml-auto inline-flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
            >
              Trade
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </SheetHeader>
      )}

      <div className={cn("space-y-3", embedded ? "py-3" : "flex-1 overflow-y-auto px-5 py-4")}>
        {query.isPending ? (
          <TableSkeleton label="Loading thesis thread" columns={3} />
        ) : query.isError ? (
          <div role="alert" className="rounded-lg border p-4 text-center">
            <p className="text-sm">{query.error.message}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => query.refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            {pinned ? renderPost(pinned, { highlight: true }) : null}
            {topLevel.length === 0 && !pinned ? (
              <p className="py-8 text-center text-muted-foreground text-sm">No entries in this thread yet.</p>
            ) : (
              <div className="space-y-2.5">
                {topLevel.map((post) => (
                  <div key={post.id} className="space-y-2">
                    {renderPost(post)}
                    {(byParent.get(post.id) ?? []).map((child) => renderPost(child, { nested: true }))}
                  </div>
                ))}
              </div>
            )}
            {query.hasNextPage && (
              <div className="flex justify-center pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={query.isFetchingNextPage}
                  onClick={() => query.fetchNextPage()}
                >
                  {query.isFetchingNextPage ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <div className={cn("border-t py-3.5", !embedded && "bg-background/80 px-5")}>
        {replyTarget && (
          <div className="mb-2 flex items-center justify-between text-muted-foreground text-xs">
            <span>Replying to @{replyTarget.handle}</span>
            <button type="button" onClick={() => setReplyTarget(null)} className="hover:text-foreground">
              Cancel
            </button>
          </div>
        )}
        {actionError && (
          <p role="alert" className="mb-2 text-negative text-xs">
            {actionError}
          </p>
        )}
        <div className="rounded-lg border bg-card/60 p-2.5 focus-within:ring-2 focus-within:ring-ring/60">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_COMMENT))}
            placeholder={auth.authenticated ? "Add a reply…" : "Sign in to reply to this thesis"}
            aria-label="Thread reply"
            rows={2}
            className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <div className="mt-1.5 flex items-center justify-between">
            <span className="tabular text-muted-foreground text-xs">
              {draft.length}/{MAX_COMMENT}
            </span>
            <Button
              size="sm"
              disabled={
                postComment.isPending ||
                (auth.authenticated ? !draft.trim() || !activeParentId : !auth.configured)
              }
              onClick={submitReply}
            >
              {postComment.isPending ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Send className="mr-1.5 size-3.5" />
              )}
              {auth.authenticated ? "Reply" : "Sign in"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
