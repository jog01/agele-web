import { SlidersHorizontal } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  activeFeedFilterCount,
  DEFAULT_FEED_FILTERS,
  FEED_ACTIVITIES,
  FEED_USD_FIELDS,
  type FeedFilters,
  type FeedUsdField,
} from "@/lib/feed-filters";

type Draft = Partial<Record<FeedUsdField, string>> & Pick<FeedFilters, "activities">;

function filterDraft(filters: FeedFilters): Draft {
  const draft: Draft = { activities: filters.activities };
  for (const field of FEED_USD_FIELDS) {
    if (filters[field] !== undefined) draft[field] = String(filters[field]);
  }
  return draft;
}

export function FeedFilterSheet({
  filters,
  onApply,
}: {
  filters: FeedFilters;
  onApply: (filters: FeedFilters) => void;
}) {
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => filterDraft(filters));
  const [error, setError] = useState("");
  const count = activeFeedFilterCount(filters);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: FeedFilters = { activities: draft.activities };
    for (const field of FEED_USD_FIELDS) {
      const value = draft[field];
      if (value) next[field] = Number(value);
    }
    if (!next.activities.length) {
      setError("Select at least one activity type.");
      return;
    }
    if (
      next.minMarketCapUsd !== undefined &&
      next.maxMarketCapUsd !== undefined &&
      next.minMarketCapUsd > next.maxMarketCapUsd
    ) {
      setError("Minimum market cap must not exceed the maximum.");
      return;
    }
    onApply(next);
    setOpen(false);
  }

  function amountField(field: FeedUsdField, label: string, placeholder: string) {
    return (
      <label htmlFor={`${fieldId}-${field}`} className="grid min-w-0 gap-1.5 font-medium text-sm">
        {label}
        <span className="relative">
          <Input
            id={`${fieldId}-${field}`}
            aria-label={`${label} USD`}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            placeholder={placeholder}
            value={draft[field] ?? ""}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setDraft((current) => ({ ...current, [field]: value }));
              setError("");
            }}
            className="h-11 pr-12 font-normal tabular"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground text-xs"
          >
            USD
          </span>
        </span>
      </label>
    );
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setDraft(filterDraft(filters));
          setError("");
        }
        setOpen(next);
      }}
    >
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={count ? `Filters ${count} active` : undefined}
          className="h-10 gap-2 pointer-coarse:h-11"
        >
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          Filters
          {count > 0 && (
            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-primary text-xs tabular">
              {count}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        className="gap-0 border-border sm:max-w-md"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          event.currentTarget instanceof HTMLElement && event.currentTarget.focus();
        }}
      >
        <SheetHeader className="border-border border-b px-5 py-5 sm:px-6">
          <SheetTitle className="text-lg">Feed filters</SheetTitle>
          <SheetDescription>Choose which activity appears in this feed.</SheetDescription>
        </SheetHeader>
        <form onSubmit={apply} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
            {amountField("minSizeUsd", "Minimum trade size", "All sizes")}
            {amountField("minPortfolioUsd", "Trader portfolio size", "Any portfolio")}
            <fieldset className="min-w-0 space-y-2">
              <legend className="font-medium text-sm">Market cap range</legend>
              <div className="grid grid-cols-2 gap-3">
                {amountField("minMarketCapUsd", "Minimum", "No minimum")}
                {amountField("maxMarketCapUsd", "Maximum", "No maximum")}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 font-medium text-sm">Activity</legend>
              <div className="grid grid-cols-2 gap-x-2">
                {FEED_ACTIVITIES.map(([type, label]) => (
                  <label
                    key={type}
                    className="flex min-h-10 items-center gap-2 rounded-md text-sm pointer-coarse:min-h-11"
                  >
                    <input
                      type="checkbox"
                      checked={draft.activities.includes(type)}
                      onChange={(event) => {
                        const checked = event.currentTarget.checked;
                        setDraft((current) => ({
                          ...current,
                          activities: checked
                            ? [...current.activities, type]
                            : current.activities.filter((activity) => activity !== type),
                        }));
                        setError("");
                      }}
                      className="size-4 shrink-0 accent-primary"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
          </div>
          <SheetFooter className="gap-3 border-border border-t px-5 py-4 sm:px-6">
            <p className="text-muted-foreground text-xs">Saved on this device for this feed.</p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1"
                onClick={() => {
                  setDraft(filterDraft(DEFAULT_FEED_FILTERS));
                  setError("");
                }}
              >
                Reset
              </Button>
              <Button type="submit" className="h-11 flex-1">
                Apply filters
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
