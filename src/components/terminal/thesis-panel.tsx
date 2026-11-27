"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { CornerDownRight, Heart, Loader2, MessageSquare, Pin } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { TraderLink } from "@/components/common/trader-link";
import { type ActiveThesisThread, ThesisThreadSheet } from "@/components/social/thesis-thread-sheet";
import { TraderAvatar } from "@/components/social/trader-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/use-now";
import {
  usePinThesisVersion,
  usePostComment,
  usePostThesis,
  useReactToPost,
} from "@/hooks/use-social-actions";
import type { Comment, PostPosition } from "@/lib/api/client";
import { useToken } from "@/lib/api/queries";
import { tokenCommentsQuery } from "@/lib/api/social";
import { timeAgo, utcTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TableSkeleton } from "./panel-skeleton";

const MAX_THESIS = 3000;
const MAX_COMMENT = 200;

type ComposeMode = "thesis" | "comment";

export function ThesisPanel({ mint }: { mint: string }) {
  const auth = useAuth();
  const { data: token } = useToken(mint);
  const query = useInfiniteQuery(tokenCommentsQuery(mint, auth));
  const postThesis = usePostThesis();
  const postComment = usePostComment();
  const reactToPost = useReactToPost();
  const pinThesis = usePinThesisVersion();

  const [mode, setMode] = useState<ComposeMode>("thesis");
  const [position, setPosition] = useState<PostPosition>("long");
  const [replyTarget, setReplyTarget] = useState<{ id: string; handle: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<ActiveThesisThread | null>(null);
  const now = useNow(30_000);

  const comments = query.data?.pages.flatMap((page) => page.comments) ?? [];
  const limit = mode === "thesis" ? MAX_THESIS : MAX_COMMENT;
  const submitting = postThesis.isPending || postComment.isPending;

  async function submit() {
    if (!auth.authenticated) {
      auth.login();
      return;
    }
    const body = draft.trim();
    if (!body) return;
    setError(null);
    try {
      if (mode === "thesis") {
        await postThesis.mutateAsync({ mint, body, position });
      } else {
        await postComment.mutateAsync({
          mint,
          body,
          parentId: replyTarget?.id,
        });
      }
      setDraft("");
      setReplyTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post");
    }
  }

  async function toggleLike(post: Comment) {
    if (!auth.authenticated) {
      auth.login();
      return;
    }
    setError(null);
    try {
      await reactToPost.mutateAsync({
        id: post.id,
        liked: !post.likedByMe,
        mint,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update reaction");
    }
  }

  async function togglePin(post: Comment) {
    setError(null);
    try {
      await pinThesis.mutateAsync({
        id: post.id,
        pinned: !post.pinned,
        mint,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update pin");
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2.5 rounded-lg border bg-background/60 p-3 focus-within:ring-2 focus-within:ring-ring/60">
        <div className="flex flex-wrap items-center gap-2">
          <fieldset aria-label="Post type" className="flex items-center gap-1 border-0 p-0">
            {(
              [
                ["thesis", "Thesis"],
                ["comment", "Comment"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => {
                  setMode(value);
                  if (value === "thesis") setReplyTarget(null);
                  setDraft((prev) => prev.slice(0, value === "thesis" ? MAX_THESIS : MAX_COMMENT));
                }}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[11px] transition-colors",
                  mode === value
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </fieldset>
          {mode === "thesis" && (
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
                    "rounded-md border px-2 py-0.5 text-[11px] transition-colors",
                    position === value
                      ? "border-border bg-secondary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </fieldset>
          )}
          {replyTarget && (
            <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
              Replying to @{replyTarget.handle}
              <button
                type="button"
                onClick={() => setReplyTarget(null)}
                className="text-foreground hover:underline"
              >
                Clear
              </button>
            </span>
          )}
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, limit))}
          placeholder={
            mode === "thesis"
              ? "Share your thesis on this token (requires an open or recently closed position)"
              : "Add a quick comment on this token"
          }
          aria-label={mode === "thesis" ? "Thesis" : "Comment"}
          rows={mode === "thesis" ? 3 : 2}
          className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {error && (
          <p role="alert" className="text-negative text-xs">
            {error}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="tabular text-muted-foreground text-xs">
            {draft.length}/{limit}
          </span>
          <Button
            size="sm"
            disabled={submitting || (auth.authenticated ? !draft.trim() : !auth.configured)}
            onClick={submit}
          >
            {submitting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            {auth.authenticated ? (mode === "thesis" ? "Post thesis" : "Post comment") : "Sign in to post"}
          </Button>
        </div>
      </div>

      {query.isPending && <TableSkeleton label="Loading theses" columns={3} />}
      {query.isError && (
        <div role="alert" className="flex items-center justify-between rounded-md border p-3 text-xs">
          <span>{query.error.message}</span>
          <Button size="sm" variant="outline" onClick={() => query.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {query.isSuccess && comments.length === 0 && (
        <p className="py-6 text-center text-muted-foreground text-xs">
          No theses or comments on this token yet.
        </p>
      )}

      <ul className="space-y-2.5">
        {comments.map((c) => {
          const canPin =
            c.kind === "thesis" && Boolean(auth.walletAddress && c.wallet === auth.walletAddress);
          return (
            <li
              key={c.id}
              className={cn(
                "rounded-lg border p-3.5",
                c.pinned ? "border-primary/40 bg-primary/5" : "border-border bg-background/40",
              )}
            >
              <div className="flex items-start gap-2.5">
                <TraderAvatar handle={c.handle} avatarUrl={c.avatarUrl} size="sm" className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs">
                    {c.wallet ? (
                      <TraderLink
                        wallet={c.wallet}
                        handle={c.handle}
                        className="font-medium text-foreground"
                      />
                    ) : (
                      <span className="font-medium text-foreground">@{c.handle}</span>
                    )}
                    {c.kind === "thesis" && (
                      <Badge
                        variant="outline"
                        className="h-5 border-border/80 text-[10px] text-muted-foreground"
                      >
                        Thesis
                      </Badge>
                    )}
                    {c.position !== "none" && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-5 text-[10px]",
                          c.position === "long"
                            ? "border-positive/40 text-positive"
                            : "border-negative/40 text-negative",
                        )}
                      >
                        {c.position === "long" ? "Holding" : "Exited"}
                      </Badge>
                    )}
                    {c.pinned && (
                      <Badge variant="outline" className="h-5 border-primary/40 text-[10px] text-primary">
                        <Pin className="mr-0.5 size-2.5" />
                        Pinned
                      </Badge>
                    )}
                    <span className="ml-auto text-muted-foreground" title={utcTimestamp(c.createdAt)}>
                      {now ? `${timeAgo(c.createdAt, now)} ago` : ""}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-foreground/95 text-sm leading-6">{c.body}</p>
                  <div className="mt-2.5 flex items-center gap-3.5 text-muted-foreground text-xs">
                    <button
                      type="button"
                      onClick={() => toggleLike(c)}
                      aria-pressed={Boolean(c.likedByMe)}
                      aria-label={c.likedByMe ? "Unlike post" : "Like post"}
                      className={cn(
                        "inline-flex items-center gap-1 transition-colors hover:text-foreground",
                        c.likedByMe && "text-primary",
                      )}
                    >
                      <Heart className={cn("size-3.5", c.likedByMe && "fill-current")} />
                      <span className="tabular">{c.likes}</span>
                    </button>
                    {c.thesisId ? (
                      <button
                        type="button"
                        onClick={() =>
                          setActiveThread({
                            mint,
                            thesisId: c.thesisId ?? c.id,
                            symbol: token?.symbol,
                            imageUrl: token?.imageUrl ?? c.imageUrl,
                          })
                        }
                        className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                      >
                        <MessageSquare className="size-3.5" />
                        <span className="tabular">{c.replyCount}</span>
                        <span>Thread</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setMode("comment");
                          setReplyTarget({ id: c.id, handle: c.handle });
                        }}
                        className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                      >
                        <CornerDownRight className="size-3.5" />
                        Reply
                      </button>
                    )}
                    {canPin && (
                      <button
                        type="button"
                        onClick={() => togglePin(c)}
                        disabled={pinThesis.isPending}
                        className="ml-auto inline-flex items-center gap-1 transition-colors hover:text-foreground disabled:opacity-50"
                      >
                        <Pin className="size-3" />
                        {c.pinned ? "Unpin" : "Pin"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

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

      <ThesisThreadSheet
        thread={activeThread}
        onOpenChange={(open) => {
          if (!open) setActiveThread(null);
        }}
      />
    </div>
  );
}
