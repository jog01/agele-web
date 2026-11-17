"use client";

import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  LineSeries,
  PriceScaleMode,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useLiveCandles } from "@/hooks/use-live-candles";
import { useMarketDataMode } from "@/hooks/use-market-data-source";
import { useNow } from "@/hooks/use-now";
import type { Candle, Interval } from "@/lib/api/client";
import { useToken } from "@/lib/api/queries";
import { marketCapCandle, movingAverage, tokenSupply } from "@/lib/candles";
import { formatCompactUsd, formatPct, formatPrice } from "@/lib/format";
import { useTerminalStore } from "@/stores/terminal";

const INTERVALS: Interval[] = ["1m", "5m", "15m", "1h", "4h", "1d"];
const COLORS = {
  bg: "#11161d",
  text: "#94a3b8",
  grid: "#1b2430",
  crosshair: "#768ca6",
  up: "#5de0aa",
  down: "#ff8195",
};

/** Precision follows price magnitude so memecoins don't render as $0.00. */
function priceFormat(price: number) {
  const precision =
    !Number.isFinite(price) || price <= 0 || price >= 1 ? 2 : Math.min(10, Math.ceil(-Math.log10(price)) + 3);
  return { type: "price" as const, precision, minMove: 10 ** -precision };
}

const toBar = (c: Candle) => ({
  time: c.time as UTCTimestamp,
  open: c.open,
  high: c.high,
  low: c.low,
  close: c.close,
});
const toVol = (c: Candle) => ({
  time: c.time as UTCTimestamp,
  value: c.volume,
  color: c.close >= c.open ? "rgba(93,224,170,0.35)" : "rgba(255,129,149,0.35)",
});

export function PriceChart({
  mint,
  symbol,
  onLivePrice,
}: {
  mint: string;
  symbol: string;
  onLivePrice?: (p: number) => void;
}) {
  const { interval, setInterval, chartMode, setChartMode } = useTerminalStore();
  const { demoMode } = useMarketDataMode();
  const { chartStyle, scaleMode, range, ma7, ma25, setChartOptions } = useTerminalStore();
  const now = useNow();
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const candleSeries = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeries = useRef<ISeriesApi<"Histogram"> | null>(null);
  const lineSeries = useRef<ISeriesApi<"Line"> | null>(null);
  const averages = useRef<ISeriesApi<"Line">[]>([]);
  const last = useRef<Candle | null>(null);
  const bars = useRef<Candle[]>([]);
  const hovered = useRef<number | null>(null);
  const fitted = useRef("");
  const [legend, setLegend] = useState<Candle | null>(null);
  const { data: rawCandles, isPending, isError, snapshotKey } = useLiveCandles(mint, interval, onLivePrice);
  const { data: token } = useToken(mint);
  const supply = tokenSupply(token);
  const candles = useMemo(
    () =>
      chartMode === "price"
        ? rawCandles
        : supply === null
          ? []
          : rawCandles.map((c) => marketCapCandle(c, supply)),
    [rawCandles, chartMode, supply],
  );
  const format = chartMode === "mcap" ? formatCompactUsd : formatPrice;

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const c = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: COLORS.bg },
        textColor: COLORS.text,
        fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui",
        attributionLogo: true,
      },
      grid: { vertLines: { color: COLORS.grid }, horzLines: { color: COLORS.grid } },
      crosshair: { vertLine: { color: COLORS.crosshair }, horzLine: { color: COLORS.crosshair } },
      rightPriceScale: { borderColor: COLORS.grid },
      timeScale: { borderColor: COLORS.grid, timeVisible: true, secondsVisible: false },
    });
    candleSeries.current = c.addSeries(CandlestickSeries, {
      upColor: COLORS.up,
      downColor: COLORS.down,
      wickUpColor: COLORS.up,
      wickDownColor: COLORS.down,
      borderVisible: false,
    });
    volumeSeries.current = c.addSeries(HistogramSeries, {
      priceScaleId: "",
      priceFormat: { type: "volume" },
    });
    lineSeries.current = c.addSeries(LineSeries, { color: COLORS.up, lineWidth: 2, lastValueVisible: false });
    averages.current = [
      c.addSeries(LineSeries, {
        color: COLORS.text,
        lineWidth: 1,
        lastValueVisible: false,
        priceLineVisible: false,
      }),
      c.addSeries(LineSeries, {
        color: COLORS.crosshair,
        lineWidth: 1,
        lastValueVisible: false,
        priceLineVisible: false,
      }),
    ];
    volumeSeries.current.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    c.subscribeCrosshairMove((param) => {
      hovered.current = typeof param.time === "number" ? param.time : null;
      setLegend(bars.current.find((bar) => bar.time === hovered.current) ?? last.current);
    });
    chart.current = c;
    return () => {
      c.remove();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candleSeries.current || !volumeSeries.current) return;
    candleSeries.current.applyOptions({
      priceFormat:
        chartMode === "mcap"
          ? { type: "custom", formatter: formatCompactUsd, minMove: 0.01 }
          : { ...priceFormat(candles.at(-1)?.close ?? 0), type: "custom", formatter: formatPrice },
    });
    candleSeries.current.setData(candles.map(toBar));
    candleSeries.current.applyOptions({ visible: chartStyle === "candles" });
    lineSeries.current?.applyOptions({
      visible: chartStyle === "line",
      priceFormat: {
        type: "custom",
        formatter: chartMode === "mcap" ? formatCompactUsd : formatPrice,
        minMove: priceFormat(candles.at(-1)?.close ?? 0).minMove,
      },
    });
    lineSeries.current?.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close })));
    averages.current.forEach((series, index) => {
      series.applyOptions({ visible: index === 0 ? ma7 : ma25 });
      series.setData(
        movingAverage(candles, index === 0 ? 7 : 25).map((point) => ({
          ...point,
          time: point.time as UTCTimestamp,
        })),
      );
    });
    chart.current?.priceScale("right").applyOptions({
      mode:
        scaleMode === "log"
          ? PriceScaleMode.Logarithmic
          : scaleMode === "percent"
            ? PriceScaleMode.Percentage
            : PriceScaleMode.Normal,
    });
    volumeSeries.current.setData(candles.map(toVol));
    bars.current = candles;
    last.current = candles.at(-1) ?? null;
    setLegend(candles.find((bar) => bar.time === hovered.current) ?? last.current);
    const fitKey = `${snapshotKey}:${range}`;
    if (candles.length && fitted.current !== fitKey) {
      if (range === "All") chart.current?.timeScale().fitContent();
      else {
        const end = candles.at(-1)!.time;
        const days = range === "1D" ? 1 : range === "5D" ? 5 : 30;
        chart.current
          ?.timeScale()
          .setVisibleRange({ from: (end - days * 86400) as UTCTimestamp, to: end as UTCTimestamp });
      }
      fitted.current = fitKey;
    }
  }, [candles, chartMode, snapshotKey, chartStyle, scaleMode, range, ma7, ma25]);

  return (
    <section
      aria-label={`${symbol} price chart`}
      className="flex min-h-[320px] flex-1 flex-col rounded-lg border bg-card"
    >
      <div className="flex flex-wrap items-center gap-3 border-b p-2">
        <ToggleGroup
          type="single"
          size="sm"
          value={interval}
          onValueChange={(v) => v && setInterval(v as Interval)}
          aria-label="Candle interval"
        >
          {INTERVALS.map((i) => (
            <ToggleGroupItem key={i} value={i} className="h-7 px-2 text-xs">
              {i}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ToggleGroup
          type="single"
          size="sm"
          value={chartMode}
          onValueChange={(v) => v && setChartMode(v as "price" | "mcap")}
          aria-label="Chart denomination"
        >
          <ToggleGroupItem value="price">Price</ToggleGroupItem>
          <ToggleGroupItem value="mcap">MCap</ToggleGroupItem>
        </ToggleGroup>
        <span className="text-xs">
          {symbol} · {interval} · {chartMode === "price" ? "Price" : "MCap"}
        </span>
        {legend && (
          <p className="tabular hidden gap-3 text-muted-foreground text-xs md:flex" aria-live="off">
            <span>O {format(legend.open)}</span>
            <span>H {format(legend.high)}</span>
            <span>L {format(legend.low)}</span>
            <span className={legend.close >= legend.open ? "text-positive" : "text-negative"}>
              C {format(legend.close)} ·{" "}
              {formatPct(legend.open ? (legend.close / legend.open - 1) * 100 : null)}
            </span>
            <span>Vol {formatCompactUsd(legend.volume)}</span>
          </p>
        )}
        <span className="ml-auto text-muted-foreground text-xs">
          {chartMode === "price" ? "Price (USD)" : "Market cap (USD)"}
          {demoMode && " · demo"}
        </span>
        {legend && (
          <p
            className="tabular flex w-full flex-wrap gap-x-3 gap-y-1 text-muted-foreground text-xs md:hidden"
            aria-live="off"
          >
            <span className={legend.close >= legend.open ? "text-positive" : "text-negative"}>
              C {format(legend.close)} ·{" "}
              {formatPct(legend.open ? (legend.close / legend.open - 1) * 100 : null)}
            </span>
            <span>Vol {formatCompactUsd(legend.volume)}</span>
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-b px-3 py-1 text-xs text-muted-foreground">
        <ToggleGroup
          type="single"
          size="sm"
          value={range}
          onValueChange={(v) => v && setChartOptions({ range: v as typeof range })}
          aria-label="Visible range"
        >
          {(["1D", "5D", "1M", "All"] as const).map((v) => (
            <ToggleGroupItem key={v} value={v}>
              {v}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <select
          aria-label="Price scale"
          value={scaleMode}
          onChange={(e) => setChartOptions({ scaleMode: e.target.value as typeof scaleMode })}
          className="bg-card"
        >
          <option value="normal">Normal</option>
          <option value="log">Log</option>
          <option value="percent">%</option>
        </select>
        <ToggleGroup
          type="single"
          size="sm"
          value={chartStyle}
          onValueChange={(v) => v && setChartOptions({ chartStyle: v as typeof chartStyle })}
          aria-label="Chart style"
        >
          <ToggleGroupItem value="candles">Candles</ToggleGroupItem>
          <ToggleGroupItem value="line">Line</ToggleGroupItem>
        </ToggleGroup>
        <label>
          <input type="checkbox" checked={ma7} onChange={(e) => setChartOptions({ ma7: e.target.checked })} />{" "}
          MA 7
        </label>
        <label>
          <input
            type="checkbox"
            checked={ma25}
            onChange={(e) => setChartOptions({ ma25: e.target.checked })}
          />{" "}
          MA 25
        </label>
        <button
          type="button"
          disabled
          title="My swaps needs sign-in and API data; no endpoint is available yet."
          className="opacity-50"
        >
          My swaps
        </button>
        <button
          type="button"
          disabled
          title="Thesis overlays need API data; no endpoint is available yet."
          className="opacity-50"
        >
          Thesis
        </button>
        <time className="ml-auto tabular">
          {now ? `${new Date(now).toISOString().slice(11, 19)} UTC` : "UTC"}
        </time>
      </div>
      <div className="relative min-h-0 flex-1">
        <div
          ref={container}
          className="absolute inset-0"
          role="img"
          aria-label={`${symbol} candlestick chart, ${interval} interval`}
        />
        {isPending && <Skeleton className="absolute inset-2" />}
        {isError && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            Chart data unavailable.
          </div>
        )}
        {!isPending && !isError && !candles.length && (
          <p className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            {chartMode === "mcap" && supply === null
              ? "Market cap unavailable: supply cannot be calculated."
              : "No candles available."}
          </p>
        )}
      </div>
    </section>
  );
}
