"use client";

import { ArrowLeft, ArrowUpRight, Bell } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AssetAvatar } from "@/components/common/asset-avatar";
import { ThesisThreadBody } from "@/components/social/thesis-thread-sheet";
import { TraderAvatar } from "@/components/social/trader-avatar";
import { Badge } from "@/components/ui/badge";
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
import type { Notification, NotificationPage } from "@/lib/api/notifications";
import { shortAddress, timeAgo, utcTimestamp } from "@/lib/format";
import { positionUrl } from "@/lib/position-replay";
import { solanaCluster } from "@/lib/solana/cluster";
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

export function notificationHref(
  { details, token, actors }: Notification,
  source: NotificationPage["source"],
) {
  const wallet = actors[0]?.wallet;
  switch (details.kind) {
    case "follow":
      return wallet ? `/traders/${encodeURIComponent(wallet)}` : null;
    case "leaderboard":
      return `/leaderboard?window=${details.window}`;
    case "trader_activity": {
      if (source === "indexed") {
        return `https://solscan.io/tx/${encodeURIComponent(details.signature)}${solanaCluster().explorerQuery}`;
      }
      if (!wallet || !token) return null;
      const url = positionUrl(new URL("https://agele.invalid/feed"), {
        wallet,
        mint: token.mint,
        fillId: details.tradeId,
      });
      return url.pathname + url.search;
    }
    default:
      return null;
  }
}

function notificationAction({ details, token }: Notification) {
  switch (details.kind) {
    case "trader_activity":
      return `${details.side === "buy" ? "Bought" : "Sold"} ${token?.symbol ?? "a token"}`;
    case "thesis_like":
      return token ? `Liked your ${token.symbol} thesis` : "Liked your thesis";
    case "follow":
      return "Started following you";
    case "leaderboard":
      return `Your ${details.window} leaderboard rank is #${details.rank}`;
    case "clan_invite":
      return `Invited you to ${details.clanName}`;
    case "send":
      return `Sent you ${details.amount}${token ? ` ${token.symbol}` : ""}`;
  }
}

type Thesis = { mint: string; thesisId: string; postId: string; symbol: string; imageUrl: string | null };

function NotificationRow({
  item,
  now,
  source,
  close,
  openThesis,
}: {
  item: Notification;
  now: number;
  source: NotificationPage["source"];
  close: () => void;
  openThesis: (thesis: Thesis) => void;
}) {
  const { token, details } = item;
  const actor = item.actors[0];
  const actorName =
    actor?.displayName || actor?.handle || (actor?.wallet ? shortAddress(actor.wallet) : "Agele");
  const href = notificationHref(item, source);
  const external = href?.startsWith("https://");
  const rowClass =
    "grid w-full grid-cols-[32px_minmax(0,1fr)_auto] items-start gap-3 rounded-md px-1.5 py-3.5 text-left";
  const actionClass = "hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-ring";
  const content = (
    <>
      <span aria-hidden="true">
        <TraderAvatar handle={actorName} avatarUrl={actor?.avatarUrl} />
      </span>
      <span className="flex min-w-0 flex-col gap-1 text-sm">
        <span className="wrap-anywhere font-semibold">
          {actorName}
          {item.count > 1 && ` + ${item.count - 1}`}
        </span>
        <span className="wrap-anywhere">{notificationAction(item)}</span>
        <time
          className="text-muted-foreground text-xs"
          dateTime={new Date(item.createdAt * 1000).toISOString()}
          title={utcTimestamp(item.createdAt)}
        >
          {timeAgo(item.createdAt, now)} ago
        </time>
      </span>
      <span className="flex min-h-8 items-center gap-2">
        {token && <AssetAvatar imageUrl={token.imageUrl} className="size-6" />}
        {external && <ArrowUpRight aria-hidden="true" className="size-3.5 text-muted-foreground" />}
      </span>
    </>
  );

  return (
    <li>
      {details.kind === "thesis_like" && token ? (
        <button
          type="button"
          onClick={() => openThesis({ ...token, thesisId: details.thesisId, postId: details.postId })}
          className={cn(rowClass, actionClass)}
        >
          {content}
        </button>
      ) : href ? (
        <Link
          href={href}
          prefetch={false}
          onNavigate={close}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          className={cn(rowClass, actionClass)}
        >
          {content}
        </Link>
      ) : (
        <div className={rowClass}>{content}</div>
      )}
    </li>
  );
}

function NotificationSkeleton() {
  return (
    <div role="status" aria-label="Loading notifications" className="space-y-5 py-4">
      <Skeleton className="h-4 w-12" />
      {[1, 2, 3].map((row) => (
        <div key={row} aria-hidden="true" className="flex gap-3 border-border/60 border-b py-3 pl-1.5">
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

function NotificationSettings({ notifications }: { notifications: ReturnType<typeof useNotifications> }) {
  const { settings, saveSettings, soundArmed, enableSound } = notifications;
  const [soundError, setSoundError] = useState(false);
  if (settings.isPending) return <NotificationSkeleton />;
  if (!settings.data) {
    return (
      <div role="alert" className="space-y-3 py-8 text-center text-muted-foreground text-sm">
        <p>Couldn’t load notification settings.</p>
        <Button variant="outline" onClick={() => settings.refetch()}>
          Retry
        </Button>
      </div>
    );
  }
  const value = settings.data;
  return (
    <div className="divide-y divide-border/60">
      <label className="flex min-h-14 items-center justify-between gap-4 py-3 text-sm">
        Following activity
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={value.traderActivity}
          disabled={saveSettings.isPending}
          onChange={(event) => saveSettings.mutate({ ...value, traderActivity: event.target.checked })}
        />
      </label>
      <label className="flex min-h-14 items-center justify-between gap-4 py-3 text-sm">
        Alert sound
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={value.sound}
          disabled={saveSettings.isPending}
          onChange={(event) => {
            const sound = event.target.checked;
            if (sound) void enableSound().then((ready) => setSoundError(!ready));
            else setSoundError(false);
            saveSettings.mutate({ ...value, sound });
          }}
        />
      </label>
      {value.sound && !soundArmed && (
        <div className="space-y-2 py-3">
          <p className="text-muted-foreground text-xs">
            Your browser requires permission to play alerts in this tab.
          </p>
          <Button
            variant="outline"
            className="min-h-10 pointer-coarse:min-h-11"
            onClick={() => void enableSound().then((ready) => setSoundError(!ready))}
          >
            Enable sound here
          </Button>
        </div>
      )}
      {(saveSettings.isError || soundError) && (
        <p role="alert" className="py-3 text-negative text-sm">
          {saveSettings.isError
            ? "Couldn’t save notification settings. Try again."
            : "Sound isn’t available in this tab."}
        </p>
      )}
    </div>
  );
}

type Panel = "inbox" | "settings" | Thesis;

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("inbox");
  const notifications = useNotifications(open);
  const { auth, enabled, list } = notifications;
  const now = useNow(30_000);
  const source = list.data?.pages[0]?.source;
  const items = [
    ...new Map(list.data?.pages.flatMap((page) => page.items.map((item) => [item.id, item]))).values(),
  ];

  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setPanel("inbox");
  }

  return (
    <Sheet open={open} onOpenChange={changeOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-10 shrink-0 lg:min-h-10 pointer-coarse:size-11"
          aria-label="Notifications"
        >
          <Bell className="size-4" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent className="gap-0 bg-sidebar sm:max-w-[432px]">
        <SheetHeader className="flex-row items-center gap-3 border-border/60 border-b py-4 pr-16 pl-4 sm:pl-6">
          {panel !== "inbox" && (
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 size-10 pointer-coarse:size-11"
              aria-label="Back to notifications"
              onClick={() => setPanel("inbox")}
            >
              <ArrowLeft aria-hidden="true" />
            </Button>
          )}
          <SheetTitle className="text-lg">
            {panel === "inbox"
              ? "Notifications"
              : panel === "settings"
                ? "Notification settings"
                : `${panel.symbol} thesis`}
          </SheetTitle>
          {panel === "inbox" && source === "demo" && (
            <Badge variant="outline" className="text-muted-foreground">
              Demo
            </Badge>
          )}
          <SheetDescription className="sr-only">Activity and updates for your account.</SheetDescription>
        </SheetHeader>
        <div className="workspace-scrollbars min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6">
          {typeof panel === "object" ? (
            <ThesisThreadBody thread={panel} focusPostId={panel.postId} embedded />
          ) : panel === "settings" && auth.authenticated ? (
            <NotificationSettings notifications={notifications} />
          ) : !auth.ready || (enabled && (list.isPending || now === null)) ? (
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
          ) : !list.data || !source ? (
            <div role="alert" className="space-y-3 py-8 text-center text-muted-foreground text-sm">
              <p>Couldn’t load your notifications.</p>
              <Button variant="outline" onClick={() => list.refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <>
              {items.length === 0 && !list.hasNextPage && (
                <div className="space-y-1 py-8 text-center text-sm">
                  <p className="font-medium">No notifications yet</p>
                  <p className="text-muted-foreground">New activity will appear here.</p>
                </div>
              )}
              {now !== null &&
                notificationGroups(items, now).map((group, index) =>
                  group.length > 0 ? (
                    <section key={GROUP_LABELS[index]} className="py-4">
                      <h3 className="px-1.5 pb-1 font-semibold text-xs">{GROUP_LABELS[index]}</h3>
                      <ul className="divide-y divide-border/60">
                        {group.map((item) => (
                          <NotificationRow
                            key={item.id}
                            item={item}
                            now={now}
                            source={source}
                            close={() => changeOpen(false)}
                            openThesis={setPanel}
                          />
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
              {(list.hasNextPage || list.isError) && (
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
              )}
            </>
          )}
        </div>
        {panel === "inbox" && (
          <footer className="space-y-3 border-border/60 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-muted-foreground text-xs sm:px-6">
            {auth.authenticated && enabled && (
              <Button
                variant="outline"
                className="min-h-10 w-full pointer-coarse:min-h-11"
                onClick={() => setPanel("settings")}
              >
                Notification settings
              </Button>
            )}
            <p>Alerts open context. They never place a trade.</p>
          </footer>
        )}
      </SheetContent>
    </Sheet>
  );
}
