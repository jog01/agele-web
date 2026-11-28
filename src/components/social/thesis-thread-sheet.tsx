"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowUpRight, CornerDownRight, Heart, Loader2, Pin, Send } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { AssetAvatar } from "@/components/common/asset-avatar";
import { TraderLink } from "@/components/common/trader-link";
import { TableSkeleton } from "@/components/terminal/panel-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useDialogFocusReturn } from "@/hooks/use-dialog-focus-return";
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
  const focusReturn = useDialogFocusReturn();
  return (
    <Sheet open={Boolean(thread)} onOpenChange={onOpenChange}>
      <SheetContent {...focusReturn} side="right" className="flex flex-col gap-0 p-0 sm:max-w-lg">
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
  const replyInput = useRef<HTMLTextAreaElement>(null);

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
    if (postComment.isPending || (!auth.authenticated && (!auth.configured || !auth.ready))) return;
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

  function renderPost(post: Comment, opts?: { nested?: boolean }) {
    const canPin =
      post.kind === "thesis" && Boolean(auth.walletAddress && post.wallet === auth.walletAddress);
    return (
      <div key={post.id} className={cn("py-5", opts?.nested && "ml-4 border-border/60 border-l pl-4 pt-1")}>
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
                <Badge variant="secondary" className="h-5 text-[10px] text-muted-foreground">
                  Thesis
                </Badge>
              )}
              {post.position !== "none" && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "h-5 text-[10px]",
                    post.position === "long"
                      ? "bg-positive/10 text-positive"
                      : "bg-negative/10 text-negative",
                  )}
                >
                  {post.position === "long" ? "Holding" : "Exited"}
                </Badge>
              )}
              {post.pinned && (
                <Badge variant="secondary" className="h-5 bg-primary/10 text-[10px] text-primary">
                  <Pin className="mr-0.5 size-2.5" />
                  Pinned
                </Badge>
              )}
              <span className="ml-auto text-muted-foreground" title={utcTimestamp(post.createdAt)}>
                {now ? `${timeAgo(post.createdAt, now)} ago` : ""}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap wrap-anywhere text-foreground/95 text-sm leading-6">
              {post.body}
            </p>
            <div className="-ml-2 mt-1 flex items-center gap-1 text-muted-foreground text-xs">
              <button
                type="button"
                onClick={() => toggleLike(post)}
                aria-pressed={Boolean(post.likedByMe)}
                aria-label={post.likedByMe ? "Unlike post" : "Like post"}
                disabled={reactToPost.isPending}
                className={cn(
                  "inline-flex min-h-10 min-w-10 items-center justify-center gap-1 rounded px-2 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground/50 disabled:opacity-50 pointer-coarse:min-h-11 pointer-coarse:min-w-11",
                  post.likedByMe && "text-primary",
                )}
              >
                <Heart className={cn("size-3.5", post.likedByMe && "fill-current")} />
                <span className="tabular">{post.likes}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setReplyTarget({ id: post.id, handle: post.handle });
                  replyInput.current?.focus();
                }}
                className="inline-flex min-h-10 min-w-10 items-center justify-center gap-1 rounded px-2 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground/50 pointer-coarse:min-h-11 pointer-coarse:min-w-11"
              >
                <CornerDownRight className="size-3.5" />
                Reply
              </button>
              {canPin && (
                <button
                  type="button"
                  onClick={() => togglePin(post)}
                  disabled={pinThesis.isPending}
                  className="ml-auto inline-flex min-h-10 min-w-10 items-center justify-center gap-1 rounded px-2 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground/50 disabled:opacity-50 pointer-coarse:min-h-11 pointer-coarse:min-w-11"
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
        <SheetHeader className="shrink-0 border-border/60 border-b px-5 py-4">
          <div className="flex items-center gap-3 pr-11">
            <AssetAvatar imageUrl={thread.imageUrl} className="size-7" />
            <div className="min-w-0">
              <SheetTitle className="truncate text-sm">
                {thread.symbol ? `${thread.symbol} thesis` : "Thesis thread"}
              </SheetTitle>
              <SheetDescription className="text-xs">Updates and replies</SheetDescription>
            </div>
            <Link
              href={`/trade/${thread.mint}`}
              className="ml-auto inline-flex min-h-10 shrink-0 items-center gap-1 text-muted-foreground text-xs hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground/50 pointer-coarse:min-h-11"
            >
              Trade
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </SheetHeader>
      )}

      <div
        className={cn(
          embedded ? "" : "workspace-scrollbars min-h-0 flex-1 overflow-y-auto overscroll-contain px-5",
        )}
      >
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
            {topLevel.length === 0 && !pinned ? (
              <p className="py-8 text-center text-muted-foreground text-sm">No entries in this thread yet.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {pinned ? renderPost(pinned) : null}
                {topLevel.map((post) => (
                  <div key={post.id}>
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

      <form
        className={cn(
          "shrink-0 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]",
          !embedded && "bg-popover px-5",
        )}
        onSubmit={(event) => {
          event.preventDefault();
          void submitReply();
        }}
      >
        {replyTarget && (
          <div className="mb-2 flex items-center justify-between text-muted-foreground text-xs">
            <span>Replying to @{replyTarget.handle}</span>
            <button
              type="button"
              onClick={() => setReplyTarget(null)}
              className="min-h-10 px-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground/50 pointer-coarse:min-h-11"
            >
              Cancel
            </button>
          </div>
        )}
        {actionError && (
          <p role="alert" className="mb-2 text-negative text-xs">
            {actionError}
          </p>
        )}
        <div className="rounded-md border border-border/70 bg-background/40 p-3 focus-within:ring-2 focus-within:ring-ring/60">
          <textarea
            ref={replyInput}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_COMMENT))}
            placeholder={auth.authenticated ? "Add a reply…" : "Sign in to reply to this thesis"}
            aria-label="Thread reply"
            rows={2}
            className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground pointer-coarse:text-base"
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <div className="mt-1.5 flex items-center justify-between">
            <span className="tabular text-muted-foreground text-xs">
              {draft.length}/{MAX_COMMENT}
            </span>
            <Button
              type="submit"
              size="sm"
              className="h-10 pointer-coarse:h-11"
              disabled={
                postComment.isPending ||
                (auth.authenticated ? !draft.trim() || !activeParentId : !auth.configured || !auth.ready)
              }
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
      </form>
    </>
  );
}
