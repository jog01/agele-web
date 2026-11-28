import type { Candle } from "./api/client";
import type { components } from "./api/schema";

export type TraderPosition = components["schemas"]["TraderPosition"];

export interface PositionTarget {
  wallet: string;
  mint: string;
  positionId?: string;
  thesisId?: string;
  discussionKey?: string;
  fillId?: string;
}

const POSITION_PARAMS = ["trader", "mint", "position", "thesis", "discussion", "fill"] as const;

export function positionTarget(params: Pick<URLSearchParams, "get">): PositionTarget | null {
  const wallet = params.get("trader");
  const mint = params.get("mint");
  if (!wallet || !mint) return null;
  return {
    wallet,
    mint,
    positionId: params.get("position") || undefined,
    thesisId: params.get("thesis") || undefined,
    discussionKey: params.get("discussion") || undefined,
    fillId: params.get("fill") || undefined,
  };
}

export function positionUrl(url: URL, target: PositionTarget | null) {
  const next = new URL(url);
  for (const key of POSITION_PARAMS) next.searchParams.delete(key);
  if (target) {
    const { wallet, mint, positionId, thesisId, discussionKey, fillId } = target;
    next.searchParams.set("trader", wallet);
    next.searchParams.set("mint", mint);
    if (positionId) next.searchParams.set("position", positionId);
    if (thesisId) next.searchParams.set("thesis", thesisId);
    if (discussionKey) next.searchParams.set("discussion", discussionKey);
    if (fillId) next.searchParams.set("fill", fillId);
  }
  return next;
}

export function replaySeries(
  fills: TraderPosition["fills"],
  candles: Candle[],
  from: number,
  to: number,
  bucketSeconds: number,
) {
  const firstBucket = Math.floor(from / bucketSeconds) * bucketSeconds;
  const market = candles.filter((candle) => candle.time >= firstBucket && candle.time <= to);
  const visibleFills = fills.filter(
    (fill) => fill.time >= from && fill.time <= to && Number.isFinite(fill.priceUsd) && fill.priceUsd > 0,
  );
  const candleTimes = new Set(market.map((candle) => candle.time));
  const bucket = (time: number) => Math.floor(time / bucketSeconds) * bucketSeconds;
  const useCandles = market.length > 0 && visibleFills.every((fill) => candleTimes.has(bucket(fill.time)));
  const prices = new Map(visibleFills.map((fill) => [fill.time, fill.priceUsd]));
  return {
    candles: useCandles ? market : [],
    prices: useCandles
      ? []
      : Array.from(prices, ([time, price]) => ({ time, price })).sort((a, b) => a.time - b.time),
    fills: visibleFills.map((fill) => ({ ...fill, chartTime: useCandles ? bucket(fill.time) : fill.time })),
  };
}
