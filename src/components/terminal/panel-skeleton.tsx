import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton({ label, columns = 6 }: { label: string; columns?: number }) {
  return (
    <div role="status" aria-label={label} className="min-h-0 overflow-hidden px-3 py-2">
      <span className="sr-only">{label}</span>
      <div aria-hidden>
        {Array.from({ length: 7 }, (_, row) => `row-${row}`).map((row) => (
          <div
            key={row}
            className="grid h-8 items-center gap-5 border-b border-border/40"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }, (_, column) => `column-${column}`).map((column) => (
              <Skeleton key={column} className="h-2.5 w-4/5 motion-reduce:animate-none" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading chart"
      className="absolute inset-0 overflow-hidden bg-card px-3 py-4"
    >
      <span className="sr-only">Loading chart</span>
      <div aria-hidden className="flex h-full flex-col">
        <div className="flex gap-3">
          <Skeleton className="h-3 w-28 motion-reduce:animate-none" />
          <Skeleton className="h-3 w-44 motion-reduce:animate-none" />
        </div>
        <div className="relative my-6 flex-1 border-y border-border/40">
          <div className="absolute inset-x-0 top-1/3 border-t border-border/40" />
          <div className="absolute inset-x-0 top-2/3 border-t border-border/40" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Skeleton className="h-5 w-32 motion-reduce:animate-none" />
          </div>
        </div>
        <div className="flex justify-between">
          {[0, 1, 2, 3, 4].map((key) => (
            <Skeleton key={key} className="h-2 w-10 motion-reduce:animate-none" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function OrderSkeleton() {
  return (
    <section role="status" aria-label="Loading order ticket" className="space-y-3 p-3">
      <span className="sr-only">Loading order ticket</span>
      <div aria-hidden className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-8 motion-reduce:animate-none" />
          <Skeleton className="h-8 motion-reduce:animate-none" />
        </div>
        <Skeleton className="h-20 motion-reduce:animate-none" />
        <div className="grid grid-cols-4 gap-1">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-7 motion-reduce:animate-none" />
          ))}
        </div>
        <Skeleton className="h-9 motion-reduce:animate-none" />
        <Skeleton className="h-3 w-2/3 motion-reduce:animate-none" />
      </div>
    </section>
  );
}

export function TerminalSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading trading workspace"
      aria-busy="true"
      className="grid min-w-0 gap-1.5 p-1 md:h-full md:min-h-[480px] md:grid-cols-[minmax(0,1fr)_304px] lg:grid-cols-[248px_minmax(0,1fr)_304px]"
    >
      <span className="sr-only">Loading trading workspace</span>
      <div aria-hidden className="hidden min-h-0 overflow-hidden rounded-md border bg-card lg:block">
        <div className="border-b p-3">
          <Skeleton className="h-3 w-20 motion-reduce:animate-none" />
          <Skeleton className="mt-4 h-8 motion-reduce:animate-none" />
        </div>
        <TableSkeleton label="Loading markets" columns={2} />
      </div>
      <div aria-hidden className="flex min-h-0 min-w-0 flex-col gap-1.5">
        <div className="flex h-[66px] shrink-0 items-center gap-3 rounded-md border bg-card px-3">
          <Skeleton className="size-8 shrink-0 rounded-full motion-reduce:animate-none" />
          <Skeleton className="h-7 w-24 motion-reduce:animate-none" />
          <Skeleton className="ml-auto h-7 w-1/2 motion-reduce:animate-none" />
        </div>
        <div className="relative h-[360px] overflow-hidden rounded-md border bg-card md:h-auto md:min-h-[220px] md:flex-[2]">
          <ChartSkeleton />
        </div>
        <div className="min-h-[160px] overflow-hidden rounded-md border bg-card md:flex-1">
          <div className="flex h-9 items-center gap-4 border-b px-3">
            {[0, 1, 2].map((key) => (
              <Skeleton key={key} className="h-3 w-12 motion-reduce:animate-none" />
            ))}
          </div>
          <TableSkeleton label="Loading activity" columns={5} />
        </div>
      </div>
      <aside aria-hidden className="hidden min-h-0 flex-col gap-1.5 md:flex">
        <div className="min-h-0 flex-[2] overflow-hidden rounded-md border bg-card">
          <OrderSkeleton />
        </div>
        <div className="min-h-[106px] flex-1 overflow-hidden rounded-md border bg-card">
          <TableSkeleton label="Loading market details" columns={2} />
        </div>
      </aside>
    </div>
  );
}
