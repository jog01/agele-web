import { describe, expect, it } from "vitest";
import type { Candle, Trade } from "./api/client";
import { foldTrade, marketCapCandle, movingAverage, tokenSupply } from "./candles";

const candle: Candle = { time: 120, open: 10, high: 12, low: 9, close: 11, volume: 100 };
const trade: Trade = {
  signature: "tx",
  mint: "mint",
  trader: "wallet",
  side: "buy",
  time: 140,
  priceUsd: 15,
  amountUsd: 20,
  tokenAmount: 2,
};

describe("moving averages", () => {
  it("averages only complete windows", () => {
    expect(
      movingAverage([candle, { ...candle, time: 180, close: 15 }, { ...candle, time: 240, close: 19 }], 2),
    ).toEqual([
      { time: 180, value: 13 },
      { time: 240, value: 17 },
    ]);
  });
  it("handles empty, short and invalid windows", () => {
    expect(movingAverage([], 7)).toEqual([]);
    expect(movingAverage([candle], 7)).toEqual([]);
    expect(movingAverage([candle], 0)).toEqual([]);
    expect(movingAverage([candle], 1.5)).toEqual([]);
  });
});

describe("live candles", () => {
  it("updates the current bucket without mutating the snapshot", () => {
    expect(foldTrade([candle], trade, "1m")).toEqual([{ ...candle, high: 15, close: 15, volume: 120 }]);
    expect(foldTrade([candle], { ...trade, priceUsd: 8 }, "1m")[0].low).toBe(8);
    expect(candle.close).toBe(11);
  });
  it("opens at the previous close and does not invent gaps", () => {
    expect(foldTrade([candle], { ...trade, time: 360 }, "1m")).toEqual([
      candle,
      { time: 360, open: 11, high: 15, low: 11, close: 15, volume: 20 },
    ]);
  });
  it("ignores older trades, empty snapshots and invalid input", () => {
    const candles = [candle];
    expect(foldTrade(candles, { ...trade, time: 60 }, "1m")).toBe(candles);
    expect(foldTrade([], trade, "1m")).toEqual([]);
    for (const priceUsd of [0, -1, Number.NaN, Number.POSITIVE_INFINITY])
      expect(foldTrade(candles, { ...trade, priceUsd }, "1m")).toBe(candles);
  });
  it("uses each interval's bucket", () => {
    for (const interval of ["5m", "15m", "1h", "4h", "1d"] as const) {
      expect(foldTrade([{ ...candle, time: 0 }], { ...trade, time: 1 }, interval)[0].volume).toBe(120);
    }
  });
});

describe("market cap conversion", () => {
  it("scales OHLC but preserves USD volume and time", () => {
    const supply = tokenSupply({ priceUsd: 10, marketCapUsd: 1000 });
    expect(supply).toBe(100);
    expect(marketCapCandle(candle, supply!)).toEqual({
      time: 120,
      open: 1000,
      high: 1200,
      low: 900,
      close: 1100,
      volume: 100,
    });
  });
  it("rejects missing tokens, zero and non-finite prices", () => {
    expect(tokenSupply(undefined)).toBeNull();
    for (const priceUsd of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.MIN_VALUE])
      expect(tokenSupply({ priceUsd, marketCapUsd: 1000 })).toBeNull();
    expect(tokenSupply({ priceUsd: 1, marketCapUsd: Number.NaN })).toBeNull();
  });
});
