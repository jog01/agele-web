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
