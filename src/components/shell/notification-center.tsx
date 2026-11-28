"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { TraderAvatar } from "@/components/social/trader-avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotifications } from "@/hooks/use-notifications";
import { useNow } from "@/hooks/use-now";
import type { Notification } from "@/lib/api/notifications";
import { formatCompactUsd, shortAddress, timeAgo, utcTimestamp } from "@/lib/format";
import { positionUrl } from "@/lib/position-replay";
import { cn } from "@/lib/utils";

const GROUP_LABELS = ["Today", "This week", "Earlier"] as const;

export function notificationGroups(items: Notification[], now: number) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const week = new Date(today);
  week.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const groups: [Notification[], Notification[], Notification[]] = [[], [], []];
  for (const item of items) {
    const time = item.createdAt * 1000;
    groups[time >= today.getTime() ? 0 : time >= week.getTime() ? 1 : 2].push(item);
  }
  return groups;
}

export function notificationHref({ kind, target, actors }: Notification) {
  if (kind === "leaderboard") return "/leaderboard";
  if (kind === "follow") {
    const wallet = target.wallet || actors[0]?.wallet;
    return wallet ? `/traders/${encodeURIComponent(wallet)}` : null;
  }
  const wallet = target.wallet || (kind === "trader_trade" ? actors[0]?.wallet : null);
  if (!wallet || !target.mint || !target.positionId) return null;
  if (kind !== "trader_trade" && !target.thesisId) return null;
  if (kind === "thesis_comment" && !target.commentId) return null;
  const url = positionUrl(new URL("https://agele.invalid/feed"), {
    wallet,
    mint: target.mint,
    positionId: target.positionId,
    thesisId: target.thesisId ?? undefined,
    commentId: target.commentId ?? undefined,
  });
  return url.pathname + url.search;
}

function notificationAction({ kind, target }: Notification) {
  const symbol = target.symbol;
  switch (kind) {
    case "trader_trade": {
      const verb = target.side === "buy" ? "Bought" : target.side === "sell" ? "Sold" : "Traded";
      const size = target.sizeUsd == null ? "" : ` · ${formatCompactUsd(target.sizeUsd)}`;
      return `${verb} ${symbol || "a token"}${size}`;
    }
    case "thesis_like":
      return symbol ? `Liked your ${symbol} thesis` : "Liked your thesis";
    case "thesis_comment":
      return symbol ? `Commented on your ${symbol} thesis` : "Commented on your thesis";
    case "follow":
      return "Started following you";
    case "leaderboard":
      return "Leaderboard update";
  }
}

function NotificationRow({
  item,
  now,
  onOpen,
}: {
  item: Notification;
  now: number;
  onOpen: (item: Notification) => void;
}) {
  const actor = item.actors[0];
  const actorName = actor ? actor.displayName || actor.handle || shortAddress(actor.wallet) : "Agele";
  const others = Math.max(0, item.actorCount - 1);
  const href = notificationHref(item);
  const unread = item.readAt === null;
  const className = "grid min-h-20 grid-cols-[8px_32px_minmax(0,1fr)] items-start gap-2 rounded-md py-3.5";
  const content = (
    <>
      <span aria-hidden="true" className={cn("mt-3.5 size-1.5 rounded-full", unread && "bg-primary")} />
      <span aria-hidden="true">
        <TraderAvatar handle={actorName} avatarUrl={actor?.avatarUrl} />
      </span>
      <span className="flex min-w-0 flex-col gap-1 text-sm">
        {unread && <span className="sr-only">Unread: </span>}
        <span className="wrap-anywhere font-semibold">
          {actorName}
          {others > 0 && ` + ${others}`}
        </span>
        <span className="wrap-anywhere">{notificationAction(item)}</span>
        <time
          className="text-muted-foreground text-xs"
          dateTime={new Date(item.createdAt * 1000).toISOString()}
          title={utcTimestamp(item.createdAt)}
        >
          {timeAgo(item.createdAt, now)} ago
        </time>
        {!href && <span className="text-muted-foreground text-xs">Context unavailable</span>}
      </span>
    </>
  );

  return (
    <li>
      {href ? (
        <Link
          href={href}
          prefetch={false}
          onNavigate={() => onOpen(item)}
          className={cn(
            className,
            "hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-ring",
          )}
        >
          {content}
        </Link>
      ) : (
        <div className={className}>{content}</div>
      )}
    </li>
  );
}

function NotificationSkeleton() {
  return (
    <div role="status" aria-label="Loading notifications" className="space-y-5 py-4">
      <Skeleton className="h-4 w-12" />
      {[1, 2, 3].map((row) => (
        <div key={row} aria-hidden="true" className="flex gap-3 border-border/60 border-b py-3 pl-4">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-2.5 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const { auth, enabled, count, list, markRead } = useNotifications(open);
  const now = useNow(30_000);
  const items = [
    ...new Map(list.data?.pages.flatMap((page) => page.items.map((item) => [item.id, item]))).values(),
  ];
  const unreadCount = count.data?.unreadCount;
  const hasUnread = (unreadCount ?? 0) > 0 || items.some((item) => item.readAt === null);
  const allRead = items.length > 0 && !hasUnread && (unreadCount === 0 || !list.hasNextPage);

  function openItem(item: Notification) {
    setOpen(false);
    if (item.readAt === null) {
      void markRead.mutateAsync(item.id).catch(() => toast.error("Couldn’t mark the notification as read."));
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-10 shrink-0 lg:min-h-10 pointer-coarse:size-11"
          aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
        >
          <Bell className="size-4" aria-hidden="true" />
          {Boolean(unreadCount) && (
            <span
              aria-hidden="true"
              className="absolute top-0.5 right-0.5 min-w-4 rounded-full bg-primary px-0.5 text-center font-semibold text-[9px] text-primary-foreground leading-4 tabular-nums"
            >
              {(unreadCount ?? 0) > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="gap-0 bg-sidebar sm:max-w-[432px]">
        <SheetHeader className="flex-row items-center justify-between gap-2 border-border/60 border-b py-3 pr-16 pl-4 sm:pl-6">
          <SheetTitle className="text-lg">Notifications</SheetTitle>
          <SheetDescription className="sr-only">Activity and updates for your account.</SheetDescription>
          {enabled && hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              className="min-h-10 text-muted-foreground text-xs pointer-coarse:min-h-11"
              disabled={markRead.isPending}
              onClick={() => markRead.mutate(null)}
            >
              Mark all as read
            </Button>
          )}
        </SheetHeader>
        <div className="workspace-scrollbars min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6">
          {!auth.ready || (enabled && (list.isPending || now === null)) ? (
            <NotificationSkeleton />
          ) : !enabled ? (
            <div className="space-y-3 py-8 text-center text-muted-foreground text-sm">
              <p>
                {auth.authenticated
                  ? "Notifications are unavailable for this account."
                  : "Sign in to see your notifications."}
              </p>
              {!auth.authenticated && <Button onClick={auth.login}>Sign in</Button>}
            </div>
          ) : !list.data ? (
            <div role="alert" className="space-y-3 py-8 text-center text-muted-foreground text-sm">
              <p>Couldn’t load your notifications.</p>
              <Button variant="outline" onClick={() => list.refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <>
              {markRead.isError && markRead.variables === null && (
                <p role="alert" className="pt-3 text-negative text-sm">
                  Couldn’t mark all notifications as read. Try again.
                </p>
              )}
              {items.length === 0 && !list.hasNextPage && (
                <div className="space-y-1 py-8 text-center text-sm">
                  <p className="font-medium">No notifications yet</p>
                  <p className="text-muted-foreground">New activity will appear here.</p>
                </div>
              )}
              {allRead && (
                <p role="status" className="pt-4 text-muted-foreground text-xs">
                  You’re all caught up.
                </p>
              )}
              {now !== null &&
                notificationGroups(items, now).map((group, index) =>
                  group.length > 0 ? (
                    <section key={GROUP_LABELS[index]} className="py-4">
                      <h3 className="px-4 font-semibold text-xs">{GROUP_LABELS[index]}</h3>
                      <ul className="divide-y divide-border/60">
                        {group.map((item) => (
                          <NotificationRow key={item.id} item={item} now={now} onOpen={openItem} />
                        ))}
                      </ul>
                    </section>
                  ) : null,
                )}
              {list.isError && (
                <p role="alert" className="pt-3 text-muted-foreground text-sm">
                  {list.isFetchNextPageError
                    ? "Couldn’t load more notifications."
                    : "Couldn’t refresh notifications."}
                </p>
              )}
              {list.hasNextPage || list.isError ? (
                <Button
                  variant="outline"
                  className="my-4 min-h-10 w-full pointer-coarse:min-h-11"
                  disabled={list.isFetching}
                  onClick={() =>
                    list.isError && !list.isFetchNextPageError ? list.refetch() : list.fetchNextPage()
                  }
                >
                  {list.isFetchingNextPage ? "Loading…" : list.isError ? "Retry" : "Load more"}
                </Button>
              ) : null}
            </>
          )}
        </div>
        <footer className="border-border/60 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-muted-foreground text-xs sm:px-6">
          Alerts open context. They never place a trade.
        </footer>
      </SheetContent>
    </Sheet>
  );
}
