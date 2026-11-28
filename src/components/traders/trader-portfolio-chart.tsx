"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AreaSeries,
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { type TraderHistoryRange, traderPortfolioHistoryQuery } from "@/lib/api/traders";
import { chartPalette } from "@/lib/chart-palette";
import { changeTone, formatCompactUsd, formatPct, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

const RANGES: TraderHistoryRange[] = ["24h", "7d", "30d"];

function PortfolioArea({ points }: { points: { time: number; valueUsd: number }[] }) {
  const container = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<"Area"> | null>(null);
  const rising = (points.at(-1)?.valueUsd ?? 0) >= (points[0]?.valueUsd ?? 0);

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const colors = chartPalette(el);
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: colors.text,
        fontFamily: colors.font,
        attributionLogo: false,
      },
      grid: { vertLines: { visible: false }, horzLines: { color: colors.grid } },
      crosshair: { vertLine: { color: colors.crosshair }, horzLine: { color: colors.crosshair } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.15, bottom: 0.05 } },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        lockVisibleTimeRangeOnResize: true,
      },
      handleScroll: false,
      handleScale: false,
    });
    series.current = chart.addSeries(AreaSeries, {
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: { type: "custom", formatter: formatCompactUsd, minMove: 0.01 },
    });
    chartRef.current = chart;
    return () => {
      chartRef.current = null;
      series.current = null;
      chart.remove();
    };
  }, []);

  useEffect(() => {
    const el = container.current;
    if (!el || !series.current) return;
    const colors = chartPalette(el);
    const line = rising ? colors.up : colors.down;
    series.current.applyOptions({ lineColor: line, topColor: `${line}33`, bottomColor: `${line}00` });
    series.current.setData(points.map((p) => ({ time: p.time as UTCTimestamp, value: p.valueUsd })));
    chartRef.current?.timeScale().fitContent();
  }, [points, rising]);

  // Canvas/table intrinsic widths must not participate in the profile grid's minimum sizing.
  return (
    <div className="relative h-44 min-w-0 sm:h-52" aria-hidden>
      <div ref={container} className="absolute inset-0 overflow-hidden" />
    </div>
  );
}

export function TraderPortfolioChart({ wallet }: { wallet: string }) {
  const auth = useAuth();
  const [range, setRange] = useState<TraderHistoryRange>("7d");
  const history = useQuery(traderPortfolioHistoryQuery(wallet, range, auth));
  const points = history.data?.points ?? [];
  const changeUsd = history.data?.changeUsd ?? null;
  const changePct = history.data?.changePct ?? null;
  const value = points.at(-1)?.valueUsd;

  return (
    <section
      aria-labelledby="portfolio-heading"
      className="min-w-0 overflow-hidden rounded-md bg-card p-4 ring-1 ring-foreground/10 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="portfolio-heading" className="text-[11px] text-muted-foreground">
            Portfolio value
          </h2>
          {history.isPending ? (
            <Skeleton className="mt-1.5 h-6 w-40 motion-reduce:animate-none" />
          ) : (
            <p className="tabular mt-1 flex flex-wrap items-baseline gap-x-2 font-medium text-xl">
              {formatUsd(value)}
              <span className={cn("text-sm", changeTone(changeUsd))}>
                {changeUsd === null
                  ? "—"
                  : `${changeUsd > 0 ? "+" : ""}${formatUsd(changeUsd)}${changePct === null ? "" : ` (${formatPct(changePct)})`}`}
              </span>
              <span className="text-muted-foreground text-xs uppercase">{range}</span>
            </p>
          )}
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          value={range}
          onValueChange={(next) => {
            const match = RANGES.find((r) => r === next);
            if (match) setRange(match);
          }}
          aria-label="Portfolio range"
        >
          {RANGES.map((r) => (
            <ToggleGroupItem
              key={r}
              value={r}
              aria-label={`Portfolio ${r}`}
              className="h-9 px-3 text-xs uppercase"
            >
              {r}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="mt-3">
        {history.isPending ? (
          <Skeleton className="h-44 w-full motion-reduce:animate-none sm:h-52" />
        ) : history.isError ? (
          <div className="flex h-44 flex-col items-center justify-center gap-2 text-muted-foreground text-sm sm:h-52">
            <p role="alert">Portfolio history unavailable.</p>
            <Button size="sm" variant="outline" onClick={() => history.refetch()}>
              Retry
            </Button>
          </div>
        ) : points.length < 2 ? (
          <p className="flex h-44 items-center justify-center text-muted-foreground text-sm sm:h-52">
            Not enough history in this range.
          </p>
        ) : (
          <PortfolioArea points={points} />
        )}
      </div>
    </section>
  );
}
