import { describe, expect, it } from "vitest";
import type { Candle } from "./api/client";
import { positionTarget, positionUrl, replaySeries, type TraderPosition } from "./position-replay";

const position: TraderPosition = {
  id: "position",
  wallet: "wallet",
  mint: "mint",
  symbol: "TOK",
  imageUrl: null,
  openedAt: 101,
  closedAt: null,
  quantity: 1,
  avgEntryUsd: 4,
  avgEntryMarketCapUsd: null,
  avgExitMarketCapUsd: null,
  totalInvestedUsd: 20,
  pnlPct: 150,
  avgCostUsd: 4,
  priceUsd: 10,
  priceSinceFirstBuyPct: 150,
  valueUsd: 10,
  realizedPnlUsd: 24,
  unrealizedPnlUsd: 6,
  fills: [
    {
      id: "a",
      signature: "a",
      mint: "mint",
      symbol: "TOK",
      imageUrl: null,
      side: "buy",
      tokenAmount: 5,
      priceUsd: 4,
      marketCapUsd: null,
      valueUsd: 20,
      realizedPnlUsd: null,
      time: 101,
    },
    {
      id: "b",
      signature: "b",
      mint: "mint",
      symbol: "TOK",
      imageUrl: null,
      side: "sell",
      tokenAmount: 3,
      priceUsd: 8,
      marketCapUsd: null,
      valueUsd: 24,
      realizedPnlUsd: 12,
      time: 120,
    },
    {
      id: "c",
      signature: "c",
      mint: "mint",
      symbol: "TOK",
      imageUrl: null,
      side: "sell",
      tokenAmount: 1,
      priceUsd: 16,
      marketCapUsd: null,
      valueUsd: 16,
      realizedPnlUsd: 12,
      time: 121,
    },
  ],
};

const candle = (time: number): Candle => ({ time, open: 4, high: 9, low: 4, close: 8, volume: 10 });

describe("replay series", () => {
  it("places fills on their candle buckets without losing multiple fills in a bucket", () => {
    const result = replaySeries(position.fills, [candle(90), candle(120)], 100, 125, 30);
    expect(result.candles).toHaveLength(2);
    expect(result.fills.map((fill) => fill.chartTime)).toEqual([90, 120, 120]);
    expect(result.prices).toEqual([]);
  });

  it("shows recorded fill prices when market candles do not cover the selected episode", () => {
    expect(replaySeries(position.fills, [candle(120)], 100, 120, 30).prices).toEqual([
      { time: 101, price: 4 },
      { time: 120, price: 8 },
    ]);
  });

  it("has no chart data for ranges with neither market candles nor usable fills", () => {
    expect(replaySeries(position.fills, [candle(90)], 180, 200, 30)).toEqual({
      candles: [],
      fills: [],
      prices: [],
    });
  });
});

it("keeps the background URL and round-trips the replay selection", () => {
  const url = new URL("https://agele.test/traders/wallet?window=7d#recent");
  const target = {
    wallet: "wallet",
    mint: "mint",
    positionId: "position",
    discussionKey: "trade:a",
    fillId: "a",
    thesisId: undefined,
    commentId: "comment",
  };
  const opened = positionUrl(url, target);
  expect(positionTarget(opened.searchParams)).toEqual(target);
  expect(positionUrl(opened, null).href).toBe(url.href);
  expect(positionTarget(new URLSearchParams("trader=wallet"))).toBeNull();
});
