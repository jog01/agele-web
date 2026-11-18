import { Skeleton } from "@/components/ui/skeleton";

export const PROFILE_FRAME =
  "mx-auto w-full max-w-[1120px] space-y-4 px-4 py-5 sm:px-6 sm:py-6 pointer-coarse:[&_button]:min-h-11";

export function TraderTableSkeleton({ label, rows = 3 }: { label: string; rows?: 1 | 3 }) {
  return (
    <div role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div aria-hidden>
        <div className="grid h-9 grid-cols-3 items-center gap-4 border-y bg-background/40 px-4 sm:px-5">
          {["token", "value", "pnl"].map((key) => (
            <Skeleton key={key} className="h-2.5 w-12 last:justify-self-end motion-reduce:animate-none" />
          ))}
        </div>
        {["first", "second", "third"].slice(0, rows).map((key) => (
          <div
            key={key}
            className="grid h-16 grid-cols-3 items-center gap-4 border-b px-4 last:border-0 sm:px-5"
          >
            <div className="space-y-2">
              <Skeleton className="h-3 w-16 motion-reduce:animate-none" />
              <Skeleton className="h-2.5 w-12 motion-reduce:animate-none" />
            </div>
            <Skeleton className="h-3 w-16 justify-self-end motion-reduce:animate-none" />
            <Skeleton className="h-3 w-16 justify-self-end motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TraderProfileLoading() {
  return (
    <div className={PROFILE_FRAME}>
      <div role="status" aria-label="Loading trader profile">
        <span className="sr-only">Loading trader profile…</span>
        <div aria-hidden className="space-y-4">
          <div className="flex h-10 items-center">
            <Skeleton className="h-3 w-28 motion-reduce:animate-none" />
          </div>
          <section className="overflow-hidden rounded-md border bg-card">
            <div className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5">
              <div className="flex min-h-[88px] items-start gap-3">
                <Skeleton className="size-11 shrink-0 rounded-full motion-reduce:animate-none" />
                <div className="space-y-3">
                  <Skeleton className="h-6 w-36 motion-reduce:animate-none" />
                  <Skeleton className="h-3 w-40 motion-reduce:animate-none" />
                  <Skeleton className="h-3 w-28 motion-reduce:animate-none" />
                </div>
              </div>
              <Skeleton className="h-11 w-32 motion-reduce:animate-none" />
            </div>
            <div className="grid grid-cols-2 divide-x border-t bg-background/30">
              {["realized", "unrealized"].map((key) => (
                <div key={key} className="space-y-3 px-4 py-3 sm:px-5">
                  <Skeleton className="h-2.5 w-20 motion-reduce:animate-none" />
                  <Skeleton className="h-5 w-24 motion-reduce:animate-none" />
                </div>
              ))}
            </div>
          </section>
          <section className="space-y-4 rounded-md border bg-card p-4 sm:p-5">
            <div className="flex min-h-11 flex-wrap items-center justify-between gap-3">
              <Skeleton className="h-4 w-40 motion-reduce:animate-none" />
              <Skeleton className="h-10 w-40 motion-reduce:animate-none" />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {["rank", "pnl", "return", "volume", "trades", "win-rate"].map((key) => (
                <div key={key} className="min-w-0 space-y-3 rounded bg-background px-3 py-2.5">
                  <Skeleton className="h-2.5 w-12 motion-reduce:animate-none" />
                  <Skeleton className="h-4 w-16 motion-reduce:animate-none" />
                </div>
              ))}
            </div>
          </section>
          <div className="grid items-start gap-4 xl:grid-cols-2">
            {["Open positions", "Recent trades"].map((title) => (
              <section key={title} className="min-w-0 overflow-hidden rounded-md border bg-card">
                <div className="flex h-14 items-center px-4 sm:px-5">
                  <Skeleton className="h-4 w-28 motion-reduce:animate-none" />
                </div>
                <TraderTableSkeleton label={title} />
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
