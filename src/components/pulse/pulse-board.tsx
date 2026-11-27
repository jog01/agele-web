"use client";

import { ArrowUpRight, Check, Copy, Pause, Play } from "lucide-react";
import Link from "next/link";
import { type CSSProperties, Fragment, useId, useState } from "react";
import { AssetAvatar } from "@/components/common/asset-avatar";
import { PanelResizer } from "@/components/terminal/panel-resizer";
import { usePanelSize } from "@/components/terminal/use-panel-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNow } from "@/hooks/use-now";
import { usePulse } from "@/hooks/use-pulse";
import { PULSE_STAGES, type PulseSnapshot, type PulseStage, type PulseToken } from "@/lib/api/pulse";
import { DASH, formatCompact, formatCompactUsd, shortAddress, timeAgo, utcTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";
import "./pulse.css";

const STAGES = {
  new: { label: "New", description: "Newest launches first", empty: "No new launches yet." },
  finalStretch: {
    label: "Final stretch",
    description: "Near graduation",
    empty: "No tokens near graduation.",
  },
  migrated: { label: "Migrated", description: "Newest migrations first", empty: "No migrations yet." },
} satisfies Record<PulseStage, { label: string; description: string; empty: string }>;

const VENUES: Record<string, string> = {
  "pump.fun": "Pump.fun",
  pumpswap: "PumpSwap",
  "raydium-v4": "Raydium V4",
  "raydium-cpmm": "Raydium CPMM",
  "raydium-clmm": "Raydium CLMM",
  "meteora-dlmm": "Meteora DLMM",
  "meteora-damm": "Meteora DAMM",
};

const MIN_COLUMN = 280;
const GUTTER = 24;

function venueName(venue: string) {
  return VENUES[venue.toLowerCase()] ?? venue;
}

function PulseCard({ token, now }: { token: PulseToken; now: number | null }) {
  const [copy, setCopy] = useState<"copied" | "failed" | null>(null);
  const timestamp = token.stage === "migrated" ? token.migratedAt : token.launchedAt;
  const progress = token.venue === "pump.fun" ? token.curveProgressBps / 100 : null;
  const displayProgress = progress === null ? "" : `${Number(progress.toFixed(2))}%`;
  return (
    <article className="relative rounded-md border border-border/70 bg-card px-4 pt-4 transition-colors hover:border-primary/45 focus-within:border-primary/65">
      <div className="flex items-start gap-3">
        <AssetAvatar imageUrl={token.imageUrl} className="size-10" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-sm">{token.name}</h3>
          <p className="mt-0.5 truncate text-muted-foreground text-xs">{token.symbol}</p>
        </div>
        {timestamp !== null && (
          <time
            dateTime={new Date(timestamp * 1000).toISOString()}
            title={utcTimestamp(timestamp)}
            className="shrink-0 font-mono text-[11px] text-muted-foreground"
          >
            {now === null ? DASH : timeAgo(timestamp, now)}
          </time>
        )}
      </div>
      <div className="mt-1.5 flex min-h-7 items-center gap-1 text-muted-foreground">
        <span className="font-mono text-[11px]" title={token.mint}>
          {shortAddress(token.mint)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="relative z-10 -my-1 size-8 text-muted-foreground"
          aria-label={`Copy ${token.symbol} mint address`}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(token.mint);
              setCopy("copied");
            } catch {
              setCopy("failed");
            }
          }}
        >
          {copy === "copied" ? <Check className="size-3" /> : <Copy className="size-3" />}
        </Button>
        <span role="status" className="text-[11px]">
          {copy === "copied" ? "Copied" : copy === "failed" ? "Copy failed" : null}
        </span>
      </div>
      <dl className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
        <Metric label="MCap" value={formatCompactUsd(token.marketCapUsd)} />
        <Metric label="Vol 24h" value={formatCompactUsd(token.volume24hUsd)} />
        <Metric label="Holders" value={formatCompact(token.holders)} />
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
          <dt className="text-muted-foreground">Txns 24h</dt>
          <dd
            className="font-mono"
            title={`${token.txCount24h} total · ${token.buys24h} buys · ${token.sells24h} sells`}
          >
            <span className="text-positive">{formatCompact(token.buys24h)}B</span>
            <span className="text-muted-foreground"> / </span>
            <span className="text-negative">{formatCompact(token.sells24h)}S</span>
          </dd>
        </div>
      </dl>
      <div className="mt-3 flex min-h-7 flex-col justify-center">
        {token.stage === "migrated" ? (
          <span className="w-fit rounded-sm border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[11px] text-primary">
            {token.migratedVenue ? `Migrated to ${venueName(token.migratedVenue)}` : "Migrated"}
          </span>
        ) : progress !== null ? (
          <>
            <progress className="pulse-progress" aria-label="Bonding curve" value={progress} max={100} />
            <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground" aria-hidden>
              <span>Bonding curve</span>
              <span className="font-mono text-primary">{displayProgress}</span>
            </div>
          </>
        ) : null}
      </div>
      <Link
        href={`/trade/${token.mint}`}
        aria-label={`View ${token.name} (${token.symbol}) in Trade`}
        className="mt-2 flex min-h-8 items-center justify-between border-t border-border/60 text-[11px] text-muted-foreground after:absolute after:inset-0 after:rounded-md hover:text-primary focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-primary"
      >
        View token <ArrowUpRight className="size-3.5" aria-hidden />
      </Link>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono font-medium">{value}</dd>
    </div>
  );
}

function PulseSkeletonRows() {
  return (
    <div className="space-y-3" aria-hidden>
      {[0, 1, 2].map((row) => (
        <div key={row} className="space-y-3 rounded-md border border-border/70 bg-card p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full motion-reduce:animate-none" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 motion-reduce:animate-none" />
              <Skeleton className="h-2 w-12 motion-reduce:animate-none" />
            </div>
          </div>
          <Skeleton className="h-3 w-24 motion-reduce:animate-none" />
          <Skeleton className="h-7 w-4/5 motion-reduce:animate-none" />
          <Skeleton className="h-2 w-full motion-reduce:animate-none" />
          <Skeleton className="h-4 w-16 motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}

type BoardProps = {
  snapshot?: PulseSnapshot;
  loading?: boolean;
  error?: boolean;
  retry?: () => void;
  lastUpdated?: number;
};

function Board({ snapshot, loading = false, error = false, retry, lastUpdated }: BoardProps) {
  const id = useId();
  const now = useNow();
  const [active, setActive] = useState<PulseStage>("new");
  const [venue, setVenue] = useState("");
  const [paused, setPaused] = useState<PulseSnapshot>();
  const [hovered, setHovered] = useState<PulseSnapshot>();
  const [focused, setFocused] = useState<PulseSnapshot>();
  const { ref, width } = usePanelSize();
  const [leftWidth, setLeftWidth] = useState<number>();
  const [rightWidth, setRightWidth] = useState<number>();
  const available = Math.max(MIN_COLUMN * 3, width - GUTTER * 2);
  const defaultWidth = Math.round(available / 3);
  const left = Math.max(MIN_COLUMN, Math.min(leftWidth ?? defaultWidth, available - 2 * MIN_COLUMN));
  const right = Math.max(MIN_COLUMN, Math.min(rightWidth ?? defaultWidth, available - left - MIN_COLUMN));
  const display = paused ?? focused ?? hovered ?? snapshot;
  const venues = [
    ...new Set(PULSE_STAGES.flatMap((stage) => (display?.[stage] ?? []).map((token) => token.venue))),
  ].sort();
  const rows = (stage: PulseStage) =>
    (display?.[stage] ?? []).filter((token) => !venue || token.venue === venue);

  return (
    <section
      className="pulse-board mx-auto flex size-full min-h-0 max-w-[1152px] flex-col px-4 pt-5 pb-4 sm:pt-7"
      aria-labelledby={`${id}-title`}
      aria-busy={loading}
    >
      <header className="shrink-0">
        <div className="flex items-center justify-between gap-3">
          <h1 id={`${id}-title`} className="font-semibold text-[26px] tracking-tight">
            Pulse
          </h1>
          {snapshot?.source === "demo" && (
            <span className="rounded-sm border border-warning/30 px-1.5 py-0.5 font-mono text-[10px] text-warning">
              Demo
            </span>
          )}
        </div>
        <p className="text-muted-foreground text-sm">Follow the lifecycle. Find your next trade.</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <label>
            <span className="sr-only">Filter by launch platform</span>
            <select
              value={venue}
              onChange={(event) => setVenue(event.target.value)}
              className="min-h-11 max-w-40 rounded-md border border-border bg-secondary/45 px-2.5 font-medium text-xs outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9"
            >
              <option value="">All platforms</option>
              {venue && !venues.some((platform) => platform === venue) && (
                <option value={venue}>{venueName(venue)}</option>
              )}
              {venues.map((platform) => (
                <option key={platform} value={platform}>
                  {venueName(platform)}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11 text-muted-foreground sm:min-h-9"
            disabled={!snapshot}
            aria-pressed={!!paused}
            onClick={() => setPaused(paused ? undefined : display)}
          >
            {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
            {paused ? "Resume updates" : "Pause updates"}
          </Button>
        </div>
      </header>
      {error && (
        <div
          role="status"
          className="mt-2 flex shrink-0 items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-1 text-muted-foreground text-xs"
        >
          {snapshot
            ? `Pulse updates are unavailable. Last updated ${now && lastUpdated ? `${timeAgo(lastUpdated / 1000, now)} ago` : "recently"}.`
            : "Pulse data is unavailable."}
          <Button variant="ghost" size="sm" onClick={retry}>
            Retry
          </Button>
        </div>
      )}
      <fieldset className="pulse-switcher mt-3 grid shrink-0 grid-cols-3 gap-1 border-b border-border/60">
        <legend className="sr-only">Lifecycle stage</legend>
        {PULSE_STAGES.map((stage) => (
          <button
            key={stage}
            type="button"
            aria-pressed={active === stage}
            aria-controls={`${id}-${stage}`}
            onClick={() => setActive(stage)}
            className={cn(
              "min-h-11 rounded-t-sm border-b-2 border-transparent px-1 font-semibold text-xs focus-visible:outline-2 focus-visible:outline-primary",
              active === stage ? "border-primary text-primary" : "text-muted-foreground",
            )}
          >
            {STAGES[stage].label}{" "}
            {display && <span className="ml-1 font-mono text-[10px]">{rows(stage).length}</span>}
          </button>
        ))}
      </fieldset>
      <div ref={ref} className="pulse-columns mt-4 min-h-0 flex-1">
        {PULSE_STAGES.map((stage, index) => {
          const visible = rows(stage);
          return (
            <Fragment key={stage}>
              {index !== 0 && width >= MIN_COLUMN * 3 + GUTTER * 2 && (
                <div className="pulse-splitter shrink-0 justify-center" style={{ width: GUTTER }}>
                  <PanelResizer
                    label={index === 1 ? "Resize New column" : "Resize Migrated column"}
                    controls={`${id}-${index === 1 ? "new" : "migrated"}`}
                    min={MIN_COLUMN}
                    max={Math.round(available - MIN_COLUMN - (index === 1 ? right : left))}
                    value={Math.round(index === 1 ? left : right)}
                    reverse={index === 2}
                    onChange={index === 1 ? setLeftWidth : setRightWidth}
                    onReset={() => (index === 1 ? setLeftWidth(undefined) : setRightWidth(undefined))}
                  />
                </div>
              )}
              <section
                id={`${id}-${stage}`}
                aria-labelledby={`${id}-${stage}-title`}
                data-selected={active === stage}
                className={cn("pulse-column min-h-0 min-w-0 flex-col", index === 1 && "flex-1")}
                style={
                  index === 1
                    ? undefined
                    : ({ "--pulse-column-width": `${index === 0 ? left : right}px` } as CSSProperties)
                }
              >
                <div className="pulse-column-heading shrink-0 border-b border-border/65 pb-2">
                  <h2
                    id={`${id}-${stage}-title`}
                    className="flex items-center gap-2.5 font-semibold text-[15px]"
                  >
                    {STAGES[stage].label}
                    {display && (
                      <span className="rounded border border-border/70 bg-card px-1.5 font-mono text-[11px] text-muted-foreground">
                        {visible.length}
                      </span>
                    )}
                  </h2>
                  <p className="mt-0.5 text-muted-foreground text-xs">{STAGES[stage].description}</p>
                </div>
                <div className="panel-scrollbars min-h-0 flex-1 overflow-y-auto overscroll-contain py-3 pr-1">
                  {loading ? (
                    <PulseSkeletonRows />
                  ) : visible.length ? (
                    <ul
                      className="space-y-3"
                      onPointerEnter={(event) => {
                        if (event.pointerType === "mouse") setHovered(display);
                      }}
                      onPointerLeave={() => setHovered(undefined)}
                      onFocus={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(display);
                      }}
                      onBlur={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(undefined);
                      }}
                    >
                      {visible.map((token) => (
                        <li key={token.mint}>
                          <PulseCard token={token} now={now} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-md border border-dashed border-border px-3 py-5 text-center text-muted-foreground text-xs">
                      {error && !snapshot
                        ? "Waiting for market data."
                        : venue
                          ? "No tokens on this platform."
                          : STAGES[stage].empty}
                    </p>
                  )}
                </div>
              </section>
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}

export function PulseLoading() {
  return <Board loading />;
}

export function PulseBoard() {
  const query = usePulse();
  return (
    <Board
      snapshot={query.data}
      loading={query.isPending}
      error={query.isError}
      lastUpdated={query.dataUpdatedAt}
      retry={() => void query.refetch()}
    />
  );
}
