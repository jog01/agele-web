import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const FEED_FRAME =
  "mx-auto grid w-full max-w-[1120px] gap-4 px-4 py-5 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1fr)_280px] pointer-coarse:[&_button]:min-h-11";
export const FEED_CARD = "min-w-0 rounded-md border bg-card p-4 sm:p-5";

export function FeedHeading() {
  return (
    <header className="lg:col-span-2">
      <div className="flex items-center gap-2.5">
        <h1 className="font-semibold text-xl tracking-tight">Feed</h1>
        <Badge variant="outline" className="border-warning/30 bg-warning-subtle text-[10px] text-warning">
          Demo feed
        </Badge>
      </div>
      <p className="mt-1 text-muted-foreground text-sm">Market ideas and trades from the Solana community.</p>
    </header>
  );
}

export function FeedPostsSkeleton({ count = 3 }: { count?: 1 | 2 | 3 }) {
  return (
    <div role="status" aria-label="Loading feed posts" className="space-y-3">
      <span className="sr-only">Loading feed posts</span>
      {["first", "second", "third"].slice(0, count).map((key) => (
        <div key={key} aria-hidden className={FEED_CARD}>
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full motion-reduce:animate-none" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-28 motion-reduce:animate-none" />
              <Skeleton className="h-2.5 w-20 motion-reduce:animate-none" />
            </div>
            <Skeleton className="h-2.5 w-8 motion-reduce:animate-none" />
          </div>
          <div className="mt-3 min-h-12 space-y-2 py-1">
            <Skeleton className="h-3 w-full motion-reduce:animate-none" />
            <Skeleton className="h-3 w-3/4 motion-reduce:animate-none" />
          </div>
          <div className="mt-3 flex h-[66px] items-center gap-3 rounded-md border border-border/50 bg-background px-3">
            <Skeleton className="size-8 shrink-0 rounded-full motion-reduce:animate-none" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-14 motion-reduce:animate-none" />
              <Skeleton className="h-2.5 w-24 motion-reduce:animate-none" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FeedTradersSkeleton() {
  return (
    <div role="status" aria-label="Loading suggested traders" className="divide-y">
      <span className="sr-only">Loading suggested traders</span>
      {["first", "second", "third", "fourth"].map((key) => (
        <div key={key} aria-hidden className="flex h-[68px] items-center gap-2.5">
          <Skeleton className="size-8 shrink-0 rounded-full motion-reduce:animate-none" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-20 motion-reduce:animate-none" />
            <Skeleton className="h-2.5 w-24 motion-reduce:animate-none" />
          </div>
          <Skeleton className="h-10 w-14 motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}

export function FeedLoading() {
  return (
    <div className={FEED_FRAME}>
      <FeedHeading />
      <div className="min-w-0 space-y-3">
        <div aria-hidden className="flex h-11 items-center gap-1">
          <Skeleton className="h-9 w-20 motion-reduce:animate-none" />
          <Skeleton className="h-9 w-24 motion-reduce:animate-none" />
        </div>
        <FeedPostsSkeleton />
      </div>
      <aside className="min-w-0 self-start rounded-md border bg-card p-4">
        <h2 className="font-medium text-sm">Traders to watch</h2>
        <p className="mt-1 mb-2 text-muted-foreground text-xs">7-day leaderboard</p>
        <FeedTradersSkeleton />
      </aside>
    </div>
  );
}
