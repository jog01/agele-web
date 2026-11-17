import type { Candle, Interval, Token, Trade } from "./api/client";

const seconds: Record<Interval, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
};

export function foldTrade(candles: Candle[], trade: Trade, interval: Interval): Candle[] {
  const previous = candles.at(-1);
  if (
    !previous ||
    !Number.isFinite(trade.time) ||
    !Number.isFinite(trade.priceUsd) ||
    trade.priceUsd <= 0 ||
    !Number.isFinite(trade.amountUsd) ||
    trade.amountUsd < 0
  )
    return candles;
  const time = Math.floor(trade.time / seconds[interval]) * seconds[interval];
  if (time < previous.time) return candles;
  const same = time === previous.time;
  const open = same ? previous.open : previous.close;
  const candle: Candle = {
    time,
    open,
    high: Math.max(same ? previous.high : open, trade.priceUsd),
    low: Math.min(same ? previous.low : open, trade.priceUsd),
    close: trade.priceUsd,
    volume: (same ? previous.volume : 0) + trade.amountUsd,
  };
  return [...(same ? candles.slice(0, -1) : candles), candle];
}

export function tokenSupply(token: Pick<Token, "priceUsd" | "marketCapUsd"> | undefined): number | null {
  if (
    !token ||
    !Number.isFinite(token.priceUsd) ||
    token.priceUsd <= 0 ||
    !Number.isFinite(token.marketCapUsd) ||
    token.marketCapUsd <= 0
  )
    return null;
  const supply = token.marketCapUsd / token.priceUsd;
  return Number.isFinite(supply) ? supply : null;
}

export function marketCapCandle(candle: Candle, supply: number): Candle {
  return {
    ...candle,
    open: candle.open * supply,
    high: candle.high * supply,
    low: candle.low * supply,
    close: candle.close * supply,
  };
}

export function movingAverage(candles: Candle[], period: number): { time: number; value: number }[] {
  if (!Number.isInteger(period) || period < 1) return [];
  let sum = 0;
  return candles.flatMap((candle, index) => {
    sum += candle.close;
    if (index >= period) sum -= candles[index - period].close;
    return index >= period - 1 ? [{ time: candle.time, value: sum / period }] : [];
  });
}
