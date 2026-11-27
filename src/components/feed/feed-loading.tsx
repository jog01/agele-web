import { Skeleton } from "@/components/ui/skeleton";

const POST_KEYS = ["post-1", "post-2", "post-3", "post-4"] as const;
const TRADER_KEYS = ["trader-1", "trader-2", "trader-3", "trader-4", "trader-5"] as const;

export function FeedHeading() {
  return (
    <div>
      <h1 className="font-semibold text-xl tracking-tight">Feed</h1>
      <p className="mt-1 text-muted-foreground text-sm">Trades, theses, and the people behind them.</p>
    </div>
  );
}

export function FeedPostsSkeleton() {
  return (
    <div role="status" aria-label="Loading feed" className="space-y-3">
      {POST_KEYS.map((key) => (
        <div key={key} className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3.5 w-16" />
                </div>
                <Skeleton className="h-3.5 w-12" />
              </div>
              <Skeleton className="mt-3 h-4 w-5/6" />
              <Skeleton className="mt-2 h-4 w-2/3" />
              <div className="mt-3 flex items-center justify-between rounded-lg border border-border/70 bg-background/60 px-3.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="size-7 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-16" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
                <Skeleton className="size-4 rounded" />
              </div>
              <div className="mt-3 flex items-center gap-4">
                <Skeleton className="h-3.5 w-10" />
                <Skeleton className="h-3.5 w-10" />
                <Skeleton className="ml-auto h-3.5 w-20" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FeedTradersSkeleton() {
  return (
    <div role="status" aria-label="Loading traders to watch" className="divide-y divide-border/50">
      {TRADER_KEYS.map((key) => (
        <div key={key} className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-7 w-16 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function FeedLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <FeedHeading />
        <Skeleton className="h-8 w-44 rounded-lg" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <FeedPostsSkeleton />
        <aside className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3.5 w-8" />
          </div>
          <FeedTradersSkeleton />
        </aside>
      </div>
    </div>
  );
}
