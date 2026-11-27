"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  LineSeries,
  LineStyle,
  type SeriesMarker,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNow } from "@/hooks/use-now";
import type { Comment, Interval } from "@/lib/api/client";
import { tokenQueries } from "@/lib/api/queries";
import { formatCompactUsd, formatPrice } from "@/lib/format";
import { replaySeries, type TraderPosition } from "@/lib/position-replay";

const DAY = 86_400;
const ranges = {
  "7D": { days: 7, interval: "1h", seconds: 3600 },
  "1M": { days: 30, interval: "4h", seconds: 14_400 },
  ALL: { days: null, interval: "1d", seconds: DAY },
} satisfies Record<string, { days: number | null; interval: Interval; seconds: number }>;
type Range = keyof typeof ranges;

export function PositionReplayChart({
  position,
  supply,
  theses,
}: {
  position: TraderPosition;
  supply: number | null;
  theses: Comment[];
}) {
  const [range, setRange] = useState<Range>("7D");
  const [showFills, setShowFills] = useState(true);
  const [showTheses, setShowTheses] = useState(true);
  const [marketCap, setMarketCap] = useState(true);
  const now = useNow(60_000);
  const anchor =
    position.closedAt ??
    (now === null ? (position.fills.at(-1)?.time ?? position.openedAt) : Math.floor(now / 1000));
  const end =
    position.closedAt === null
      ? anchor
      : theses.reduce((latest, thesis) => Math.max(latest, thesis.createdAt), anchor);
  const { days, interval, seconds } = ranges[range];
  const start = days === null ? position.openedAt : anchor - days * DAY;
  const query = useQuery({ ...tokenQueries.candles(position.mint, interval), retry: false });
  const data = useMemo(
    () => replaySeries(position.fills, query.data ?? [], start, end, seconds),
    [position.fills, query.data, start, end, seconds],
  );
  const scale = marketCap ? supply : null;
  const chartRef = useRef<HTMLDivElement>(null);
  const hasData = Boolean(data.candles.length || data.prices.length);

  useEffect(() => {
    const element = chartRef.current;
    if (!element || !hasData || query.isPending) return;
    const style = getComputedStyle(element);
    const color = (name: string) => style.getPropertyValue(name).trim();
    const green = color("--chart-positive");
    const red = color("--chart-negative");
    const accent = color("--position-accent");
    const factor = scale ?? 1;
    const chart = createChart(element, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: color("--chart-text"),
        fontFamily: style.fontFamily,
      },
      localization: { priceFormatter: scale === null ? formatPrice : formatCompactUsd },
      grid: { vertLines: { visible: false }, horzLines: { color: color("--chart-grid") } },
      timeScale: { timeVisible: interval !== "1d", secondsVisible: false },
    });
    const priceFormat = {
      type: "custom" as const,
      formatter: scale === null ? formatPrice : formatCompactUsd,
    };
    const candles = chart.addSeries(CandlestickSeries, {
      priceFormat,
      upColor: green,
      downColor: red,
      wickUpColor: green,
      wickDownColor: red,
      borderVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
      visible: Boolean(data.candles.length),
    });
    const line = chart.addSeries(LineSeries, {
      priceFormat,
      color: accent,
      lineWidth: 2,
      pointMarkersVisible: true,
      lastValueVisible: false,
      priceLineVisible: false,
      visible: Boolean(data.prices.length),
    });
    candles.setData(
      data.candles.map(({ time, open, high, low, close }) => ({
        time: time as UTCTimestamp,
        open: open * factor,
        high: high * factor,
        low: low * factor,
        close: close * factor,
      })),
    );
    line.setData(
      data.prices.map(({ time, price }) => ({ time: time as UTCTimestamp, value: price * factor })),
    );
    const series = data.candles.length ? candles : line;
    series.createPriceLine({
      price: position.avgEntryUsd * factor,
      color: accent,
      lineStyle: LineStyle.Dashed,
      title: "Avg entry",
    });

    const markers: SeriesMarker<UTCTimestamp>[] = [];
    if (showFills) {
      for (const fill of data.fills) {
        const buy = fill.side === "buy";
        markers.push({
          time: fill.chartTime as UTCTimestamp,
          position: buy ? "belowBar" : "aboveBar",
          shape: buy ? "arrowUp" : "arrowDown",
          color: buy ? green : red,
          text: buy ? "B" : "S",
        });
      }
    }
    if (showTheses) {
      const times = (data.candles.length ? data.candles : data.prices).map(({ time }) => time);
      for (const thesis of theses) {
        if (thesis.createdAt < start || thesis.createdAt > end) continue;
        const point = times.findLast((time) => time <= thesis.createdAt);
        if (point === undefined || thesis.createdAt - point >= seconds) continue;
        markers.push({
          time: point as UTCTimestamp,
          position: "aboveBar",
          shape: "circle",
          color: accent,
          text: "T",
        });
      }
    }
    createSeriesMarkers(
      series,
      markers.sort((a, b) => a.time - b.time),
    );
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [
    data,
    end,
    hasData,
    interval,
    position.avgEntryUsd,
    query.isPending,
    scale,
    seconds,
    showFills,
    showTheses,
    start,
    theses,
  ]);

  return (
    <section className="position-replay-panel" aria-label="Replay chart">
      <div className="position-replay-panel-head">
        <h3>Replay chart</h3>
        <div className="position-replay-controls">
          {(Object.keys(ranges) as Range[]).map((key) => (
            <button key={key} type="button" aria-pressed={key === range} onClick={() => setRange(key)}>
              {key}
            </button>
          ))}
        </div>
      </div>
      {query.isPending ? (
        <Skeleton className="position-replay-plot" aria-label="Loading replay chart" />
      ) : hasData ? (
        <div
          ref={chartRef}
          className="position-replay-plot"
          role="img"
          aria-label={
            data.candles.length ? "Market candles and position markers" : "Recorded trader fill prices"
          }
        />
      ) : (
        <p role="status" className="position-replay-plot position-replay-empty">
          {query.isError
            ? "Market candles unavailable. No fills in this range."
            : "No replay data in this range."}
        </p>
      )}
      <div className="position-replay-chart-footer">
        <span>
          {!query.isPending && hasData
            ? data.candles.length
              ? "Market candles"
              : "Recorded fill prices"
            : ""}
        </span>
        <div className="position-replay-controls">
          <button type="button" aria-pressed={showFills} onClick={() => setShowFills(!showFills)}>
            Swaps
          </button>
          <button
            type="button"
            aria-pressed={showTheses}
            onClick={() => setShowTheses(!showTheses)}
            disabled={!theses.length}
          >
            Thesis
          </button>
          <button
            type="button"
            aria-pressed={scale !== null}
            onClick={() => setMarketCap(!marketCap)}
            disabled={supply === null}
          >
            {scale !== null ? "MCap" : "Price"}
          </button>
        </div>
      </div>
    </section>
  );
}
