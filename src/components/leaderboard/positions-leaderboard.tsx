"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Slider } from "radix-ui";
import { type ReactNode, useState } from "react";
import { AssetAvatar } from "@/components/common/asset-avatar";
import { TraderLink } from "@/components/common/trader-link";
import { PositionReplayLink } from "@/components/social/position-replay-link";
import { TraderAvatar } from "@/components/social/trader-avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  type InvestedBucket,
  type PositionsWindow,
  positionsLeaderboardQuery,
  type RankedPosition,
} from "@/lib/api/positions-leaderboard";
import { changeTone, formatCompactUsd, formatPct, formatUsd } from "@/lib/format";

const WINDOWS = ["24h", "7d", "30d", "all"] as const satisfies readonly PositionsWindow[];
const BUCKETS = [
  { value: "all", label: "All" },
  { value: "lt100", label: "<$100" },
  { value: "100-1k", label: "$100–$1K" },
  { value: "1k-10k", label: "$1K–$10K" },
  { value: "10k-100k", label: "$10K–$100K" },
  { value: "gt100k", label: "$100K+" },
] as const satisfies readonly { value: "all" | InvestedBucket; label: string }[];
const HOLD_STOPS = [
  { label: "0", seconds: 0 },
  { label: "1h", seconds: 3_600 },
  { label: "1d", seconds: 86_400 },
  { label: "3d", seconds: 259_200 },
  { label: "1w", seconds: 604_800 },
  { label: "2w", seconds: 1_209_600 },
  { label: "1m", seconds: 2_592_000 },
  { label: "3m+", seconds: 7_776_000 },
] as const;
const LAST_STOP = HOLD_STOPS.length - 1;
type HoldRange = [number, number];
const ANY_HOLD: HoldRange = [0, LAST_STOP];

function formatHeld(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const [whole, remainder, unit, subunit] =
    hours < 24 ? [hours, minutes % 60, "h", "m"] : [Math.floor(hours / 24), hours % 24, "d", "h"];
  return `${whole}${unit}${remainder ? ` ${remainder}${subunit}` : ""}`;
}

function HoldFilter({ onCommit }: { onCommit: (range: HoldRange) => void }) {
  const [[min, max], setRange] = useState(ANY_HOLD);
  const minLabel = HOLD_STOPS[min].label;
  const maxLabel = HOLD_STOPS[max].label;
  const label =
    min === 0 && max === LAST_STOP ? "Any" : max === LAST_STOP ? `${minLabel}+` : `${minLabel} – ${maxLabel}`;
  return (
    <fieldset className="positions-board-hold">
      <legend>Hold time</legend>
      <span className="positions-board-hold-value">{label}</span>
      <Slider.Root
        className="positions-board-slider"
        defaultValue={ANY_HOLD}
        max={LAST_STOP}
        minStepsBetweenThumbs={1}
        onValueChange={([low, high]) => setRange([low, high])}
        onValueCommit={([low, high]) => onCommit([low, high])}
      >
        <Slider.Track className="positions-board-track">
          <Slider.Range className="positions-board-range" />
        </Slider.Track>
        <Slider.Thumb
          className="positions-board-thumb"
          aria-label="Minimum hold time"
          aria-valuetext={minLabel}
        />
        <Slider.Thumb
          className="positions-board-thumb"
          aria-label="Maximum hold time"
          aria-valuetext={max === LAST_STOP ? "No maximum" : maxLabel}
        />
      </Slider.Root>
      <div aria-hidden className="positions-board-stops">
        {HOLD_STOPS.map(({ label: stop }) => (
          <span key={stop}>{stop}</span>
        ))}
      </div>
    </fieldset>
  );
}

function PositionRow({ entry, window }: { entry: RankedPosition; window: PositionsWindow }) {
  const { trader, token, thesis } = entry;
  return (
    <li className="positions-board-row">
      <span className="positions-board-rank">#{entry.rank}</span>
      <div className="positions-board-trader">
        <span aria-hidden>
          <TraderAvatar handle={trader.handle} avatarUrl={trader.avatarUrl} size="sm" />
        </span>
        <TraderLink
          className="positions-board-profile"
          wallet={trader.wallet}
          handle={trader.handle}
          window={window === "all" ? undefined : window}
        />
      </div>
      {thesis && <p className="positions-board-thesis">{thesis.body}</p>}
      <div className="positions-board-trade">
        <PositionReplayLink
          className="positions-board-replay"
          target={{
            wallet: trader.wallet,
            mint: token.mint,
            positionId: entry.positionId,
            thesisId: thesis?.id,
          }}
          aria-label={`Open ${trader.handle}'s ${token.symbol} position replay`}
        >
          <AssetAvatar imageUrl={token.imageUrl} />
          <span className="positions-board-asset">
            <strong>{token.symbol}</strong>
            <span>Avg. entry MC {formatCompactUsd(entry.avgEntryMarketCapUsd)}</span>
          </span>
        </PositionReplayLink>
        <span className="positions-board-result">
          <strong className={changeTone(entry.realizedPnlUsd)}>
            {entry.realizedPnlUsd > 0 ? "+" : ""}
            {formatUsd(entry.realizedPnlUsd)}{" "}
            <span className="positions-board-return">{formatPct(entry.pnlPct)}</span>
          </strong>
          <span>
            Invested {formatCompactUsd(entry.totalInvestedUsd)} · Held {formatHeld(entry.holdSeconds)}
          </span>
        </span>
        <ChevronRight aria-hidden className="positions-board-chevron" />
      </div>
    </li>
  );
}

function PositionSkeleton() {
  return (
    <ul aria-hidden className="positions-board-list">
      {[1, 2, 3, 4].map((row) => (
        <li key={row} className="positions-board-row">
          <Skeleton className="positions-board-rank h-4 w-6 motion-reduce:animate-none" />
          <Skeleton className="positions-board-trader h-6 w-28 motion-reduce:animate-none" />
          <Skeleton className="positions-board-thesis h-4 w-2/3 motion-reduce:animate-none" />
          <Skeleton className="positions-board-trade h-14 motion-reduce:animate-none" />
        </li>
      ))}
    </ul>
  );
}

export function PositionsLeaderboard({ tabs }: { tabs: ReactNode }) {
  const requestedWindow = useSearchParams().get("window");
  const windowFilter = WINDOWS.find((value) => value === requestedWindow) ?? "7d";
  const [bucket, setBucket] = useState<(typeof BUCKETS)[number]["value"]>("all");
  const [[minHold, maxHold], setHold] = useState(ANY_HOLD);
  const query = useInfiniteQuery(
    positionsLeaderboardQuery({
      window: windowFilter,
      invested: bucket === "all" ? undefined : bucket,
      minHoldSeconds: minHold === 0 ? undefined : HOLD_STOPS[minHold].seconds,
      maxHoldSeconds: maxHold === LAST_STOP ? undefined : HOLD_STOPS[maxHold].seconds,
    }),
  );
  const entries = query.data?.pages.flatMap((page) => page.entries) ?? [];
  const dataSource = query.data?.pages[0]?.dataSource;
  const sourceLabel =
    dataSource === "demo" ? "Demo fixtures" : dataSource === "indexed" ? "Indexed trades" : undefined;

  return (
    <section aria-labelledby="positions-board-title" className="positions-board">
      <header className="positions-board-heading">
        <h1 id="positions-board-title">Leaderboard</h1>
        <p>Find your people. Study their process.</p>
      </header>
      {tabs}
      <div className="positions-board-panel">
        <div className="positions-board-controls">
          <ToggleGroup
            type="single"
            value={windowFilter}
            aria-label="Position ranking window"
            onValueChange={(value) => {
              if (!value) return;
              const url = new URL(window.location.href);
              url.searchParams.set("window", value);
              window.history.replaceState(null, "", url);
            }}
          >
            {WINDOWS.map((value) => (
              <ToggleGroupItem className="positions-board-chip" key={value} value={value}>
                {value}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <ToggleGroup
            type="single"
            value={bucket}
            aria-label="Invested amount"
            onValueChange={(value) => {
              const next = BUCKETS.find((choice) => choice.value === value);
              if (next) setBucket(next.value);
            }}
          >
            {BUCKETS.map(({ value, label }) => (
              <ToggleGroupItem className="positions-board-chip" key={value} value={value}>
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <HoldFilter onCommit={setHold} />
        </div>
        <div className="positions-board-meta">
          {sourceLabel && <span className="positions-board-source">{sourceLabel}</span>}
          <p>Profitable closed positions · Ranked by realized PnL (USD)</p>
        </div>
        {query.isPending && (
          <p role="status" className="sr-only">
            Loading positions
          </p>
        )}
        <div aria-busy={query.isPending}>
          {query.isPending && <PositionSkeleton />}
          {entries.length > 0 && (
            <ol aria-label="Position rankings" className="positions-board-list">
              {entries.map((entry) => (
                <PositionRow key={entry.positionId} entry={entry} window={windowFilter} />
              ))}
            </ol>
          )}
          {!query.isPending && !query.isError && !entries.length && (
            <div className="positions-board-state">
              <strong>No positions match these filters</strong>
              <p>Try a different window, invested amount, or hold time.</p>
            </div>
          )}
        </div>
        {query.isError && !query.isFetchNextPageError && (
          <div className="positions-board-state">
            <p role="alert">
              {entries.length
                ? "Could not refresh positions. Showing the last snapshot."
                : "Position rankings unavailable."}
            </p>
            <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
              Retry
            </Button>
          </div>
        )}
        {query.hasNextPage && (
          <div className="positions-board-state positions-board-more">
            {query.isFetchNextPageError && <p role="alert">Could not load more positions.</p>}
            <Button
              variant="outline"
              size="sm"
              disabled={query.isFetching}
              onClick={() => void query.fetchNextPage()}
            >
              {query.isFetchingNextPage
                ? "Loading more…"
                : query.isFetchNextPageError
                  ? "Retry loading more"
                  : "Load more"}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
