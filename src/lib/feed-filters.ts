import type { FeedItem, FeedScope } from "@/lib/api/client";

export const FEED_ACTIVITIES = [
  ["bought", "Buys"],
  ["sold", "Sells"],
  ["closed", "Closed positions"],
  ["thesis", "Theses"],
  ["milestone", "Milestones"],
  ["multi-user", "Multi-user trades"],
  ["new-trader", "New traders"],
] as const satisfies readonly (readonly [FeedItem["eventType"], string])[];

type FeedActivity = (typeof FEED_ACTIVITIES)[number][0];

export const FEED_USD_FIELDS = [
  "minSizeUsd",
  "minPortfolioUsd",
  "minMarketCapUsd",
  "maxMarketCapUsd",
] as const;

export type FeedUsdField = (typeof FEED_USD_FIELDS)[number];
export type FeedFilters = Partial<Record<FeedUsdField, number>> & { activities: readonly FeedActivity[] };

export const FEED_PRESETS = [
  { label: "All", activities: FEED_ACTIVITIES.map(([value]) => value) },
  { label: "Trades", activities: ["bought", "sold", "closed", "multi-user"] },
  { label: "Theses", activities: ["thesis"] },
] as const;

export const DEFAULT_FEED_FILTERS: FeedFilters = { activities: FEED_PRESETS[0].activities };

export function feedFilterParams({ activities, ...amounts }: FeedFilters) {
  return {
    ...amounts,
    types: FEED_ACTIVITIES.map(([value]) => value)
      .filter((value) => activities.includes(value))
      .join(","),
  };
}

export function activeFeedFilterCount(filters: FeedFilters) {
  return (
    Number(filters.activities.length !== FEED_ACTIVITIES.length) +
    Number(filters.minSizeUsd !== undefined) +
    Number(filters.minPortfolioUsd !== undefined) +
    Number(filters.minMarketCapUsd !== undefined || filters.maxMarketCapUsd !== undefined)
  );
}

function storageKey(scope: FeedScope) {
  return `agele:feed-filters:${scope}`;
}

export function readFeedFilters(scope: FeedScope): FeedFilters {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey(scope)) ?? "null");
    if (!saved || typeof saved !== "object" || !("activities" in saved)) return DEFAULT_FEED_FILTERS;
    const selected: unknown = saved.activities;
    const activities = Array.isArray(selected)
      ? FEED_ACTIVITIES.map(([value]) => value).filter((value) => selected.includes(value))
      : [];
    const filters: FeedFilters = {
      activities: activities.length ? activities : DEFAULT_FEED_FILTERS.activities,
    };
    for (const field of FEED_USD_FIELDS) {
      const value = (saved as Record<string, unknown>)[field];
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) filters[field] = value;
    }
    if (
      filters.minMarketCapUsd !== undefined &&
      filters.maxMarketCapUsd !== undefined &&
      filters.minMarketCapUsd > filters.maxMarketCapUsd
    ) {
      delete filters.minMarketCapUsd;
      delete filters.maxMarketCapUsd;
    }
    return filters;
  } catch {
    return DEFAULT_FEED_FILTERS;
  }
}

export function saveFeedFilters(scope: FeedScope, filters: FeedFilters) {
  try {
    localStorage.setItem(storageKey(scope), JSON.stringify(filters));
  } catch {
    // Filters still apply for the current visit when storage is unavailable.
  }
}
