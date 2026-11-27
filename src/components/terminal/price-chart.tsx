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
import { Settings2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useLiveCandles } from "@/hooks/use-live-candles";
import { useMarketDataMode } from "@/hooks/use-market-data-source";
import { useNow } from "@/hooks/use-now";
import { useSwapOverlay } from "@/hooks/use-swap-overlay";
import type { Candle, Interval } from "@/lib/api/client";
import { useToken } from "@/lib/api/queries";
import { marketCapCandle, movingAverage, tokenSupply } from "@/lib/candles";
import { chartPalette } from "@/lib/chart-palette";
import { formatCompactUsd, formatPct, formatPrice } from "@/lib/format";
import { useTerminalStore } from "@/stores/terminal";
import { ChartSkeleton } from "./panel-skeleton";

const INTERVALS: Interval[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

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
const toVol = (c: Candle, palette: ReturnType<typeof chartPalette>) => ({
  time: c.time as UTCTimestamp,
  value: c.volume,
  color: c.close >= c.open ? palette.volumeUp : palette.volumeDown,
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
  const [settingsOpen, setSettingsOpen] = useState(false);
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
    const colors = chartPalette(el);
    const c = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: colors.bg },
        textColor: colors.text,
        fontFamily: colors.font,
        attributionLogo: true,
      },
      grid: { vertLines: { visible: false }, horzLines: { color: colors.grid } },
      crosshair: { vertLine: { color: colors.crosshair }, horzLine: { color: colors.crosshair } },
      rightPriceScale: { borderColor: colors.grid },
      timeScale: { borderColor: colors.grid, timeVisible: true, secondsVisible: false },
    });
    candleSeries.current = c.addSeries(CandlestickSeries, {
      upColor: colors.up,
      downColor: colors.down,
      wickUpColor: colors.up,
      wickDownColor: colors.down,
      borderVisible: false,
    });
    volumeSeries.current = c.addSeries(HistogramSeries, {
      priceScaleId: "",
      priceFormat: { type: "volume" },
    });
    lineSeries.current = c.addSeries(LineSeries, { color: colors.up, lineWidth: 2, lastValueVisible: false });
    averages.current = [
      c.addSeries(LineSeries, {
        color: colors.text,
        lineWidth: 1,
        lastValueVisible: false,
        priceLineVisible: false,
      }),
      c.addSeries(LineSeries, {
        color: colors.crosshair,
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
      chart.current = null;
      candleSeries.current = null;
      volumeSeries.current = null;
      lineSeries.current = null;
      averages.current = [];
      c.remove();
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
    if (container.current) {
      const colors = chartPalette(container.current);
      volumeSeries.current.setData(candles.map((candle) => toVol(candle, colors)));
    }
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

  const swaps = useSwapOverlay(mint, demoMode, candleSeries, lineSeries, chartStyle, candles, interval);

  return (
    <section
      aria-label={`${symbol} price chart`}
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border bg-card"
    >
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b px-2 py-1 [&_[data-slot=toggle-group-item]]:h-7 [&_[data-slot=toggle-group-item]]:px-2 [&_[data-slot=toggle-group-item]]:text-[11px]">
        <ToggleGroup
          type="single"
          size="sm"
          value={interval}
          onValueChange={(v) => v && setInterval(v as Interval)}
          aria-label="Candle interval"
        >
          {INTERVALS.map((i) => (
            <ToggleGroupItem key={i} value={i} className="h-7 px-2 text-[11px]">
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
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-7 px-2 text-muted-foreground text-[11px]"
          aria-expanded={settingsOpen}
          aria-controls="chart-settings"
          onClick={() => setSettingsOpen((open) => !open)}
        >
          <Settings2 className="size-3.5" aria-hidden />
          Display
        </Button>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 px-2 py-1.5">
        {legend && (
          <p
            className="tabular hidden flex-wrap gap-x-3 gap-y-1 font-mono text-muted-foreground text-[11px] lg:flex"
            aria-live="off"
          >
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
        <span className="text-muted-foreground text-[10px]">
          {chartMode === "price" ? "Price (USD)" : "Market cap (USD)"}
          {demoMode && " · demo"}
        </span>
        {legend && (
          <p
            className="tabular flex flex-wrap gap-x-3 gap-y-1 font-mono text-muted-foreground text-[11px] lg:hidden"
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
      <div
        id="chart-settings"
        hidden={!settingsOpen}
        className="max-h-[40%] shrink-0 overflow-auto border-y border-border/60 bg-background/30 px-2 py-2 text-xs text-muted-foreground"
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
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
            className="h-9 rounded-md border bg-card px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          <label className="flex min-h-9 items-center gap-2">
            <input
              type="checkbox"
              checked={ma7}
              onChange={(e) => setChartOptions({ ma7: e.target.checked })}
            />{" "}
            MA 7
          </label>
          <label className="flex min-h-9 items-center gap-2">
            <input
              type="checkbox"
              checked={ma25}
              onChange={(e) => setChartOptions({ ma25: e.target.checked })}
            />{" "}
            MA 25
          </label>
          <button
            type="button"
            disabled={swaps.disabled}
            title={swaps.title}
            aria-pressed={swaps.shown}
            onClick={swaps.toggle}
            className={`min-h-9 text-left ${swaps.disabled ? "opacity-50" : swaps.shown ? "text-positive" : ""}`}
          >
            {swaps.label}
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
      </div>
      <div className="relative min-h-0 flex-1">
        <div
          ref={container}
          className="absolute inset-0"
          role="img"
          aria-label={`${symbol} candlestick chart, ${interval} interval`}
        />
        {isPending && <ChartSkeleton />}
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
