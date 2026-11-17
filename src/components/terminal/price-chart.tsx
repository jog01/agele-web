"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useCallback, useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useLiveTrades } from "@/hooks/use-live-trades";
import type { Candle, Interval, Trade } from "@/lib/api/client";
import { tokenQueries } from "@/lib/api/queries";
import { formatPrice } from "@/lib/format";
import { useTerminalStore } from "@/stores/terminal";

const INTERVALS: Interval[] = ["1m", "5m", "15m", "1h", "4h", "1d"];
const INTERVAL_SECONDS: Record<Interval, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "4h": 14_400,
  "1d": 86_400,
};
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
  const precision = price >= 1 ? 2 : Math.min(10, Math.ceil(-Math.log10(price)) + 3);
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
  const { interval, setInterval } = useTerminalStore();
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const candleSeries = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeries = useRef<ISeriesApi<"Histogram"> | null>(null);
  const last = useRef<Candle | null>(null);
  const [legend, setLegend] = useState<Candle | null>(null);
  const { data: candles, isPending, isError } = useQuery(tokenQueries.candles(mint, interval));

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
    volumeSeries.current.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    c.subscribeCrosshairMove((param) => {
      const bar = param.seriesData.get(candleSeries.current!) as Candle | undefined;
      setLegend(bar ? { ...bar, volume: 0 } : last.current);
    });
    chart.current = c;
    return () => {
      c.remove();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candles?.length || !candleSeries.current || !volumeSeries.current) return;
    candleSeries.current.applyOptions({ priceFormat: priceFormat(candles.at(-1)!.close) });
    candleSeries.current.setData(candles.map(toBar));
    volumeSeries.current.setData(candles.map(toVol));
    last.current = candles.at(-1)!;
    setLegend(last.current);
    chart.current?.timeScale().fitContent();
  }, [candles]);

  const onTrade = useCallback(
    (t: Trade) => {
      onLivePrice?.(t.priceUsd);
      const prev = last.current;
      if (!prev || !candleSeries.current || !volumeSeries.current) return;
      const step = INTERVAL_SECONDS[interval];
      const bucket = Math.floor(t.time / step) * step;
      if (bucket < prev.time) return; // older correction: wait for the next snapshot
      const next: Candle =
        bucket === prev.time
          ? {
              ...prev,
              high: Math.max(prev.high, t.priceUsd),
              low: Math.min(prev.low, t.priceUsd),
              close: t.priceUsd,
              volume: prev.volume + t.amountUsd,
            }
          : {
              time: bucket,
              open: prev.close,
              high: Math.max(prev.close, t.priceUsd),
              low: Math.min(prev.close, t.priceUsd),
              close: t.priceUsd,
              volume: t.amountUsd,
            };
      candleSeries.current.update(toBar(next));
      volumeSeries.current.update(toVol(next));
      last.current = next;
      setLegend(next);
    },
    [interval, onLivePrice],
  );
  useLiveTrades(mint, onTrade);

  return (
    <section
      aria-label={`${symbol} price chart`}
      className="flex min-h-[320px] flex-1 flex-col rounded-lg border bg-card"
    >
      <div className="flex h-10 items-center gap-3 border-b px-2">
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
        {legend && (
          <p className="tabular hidden gap-3 text-muted-foreground text-xs md:flex" aria-live="off">
            <span>O {formatPrice(legend.open)}</span>
            <span>H {formatPrice(legend.high)}</span>
            <span>L {formatPrice(legend.low)}</span>
            <span className={legend.close >= legend.open ? "text-positive" : "text-negative"}>
              C {formatPrice(legend.close)}
            </span>
          </p>
        )}
        <span className="ml-auto text-muted-foreground text-xs">Price (USD) · demo</span>
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
      </div>
    </section>
  );
}
