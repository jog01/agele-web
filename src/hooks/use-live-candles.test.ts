// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Candle, Interval, Trade } from "@/lib/api/client";
import { useLiveCandles } from "./use-live-candles";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  subscribe: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({ useQuery: mocks.query }));
vi.mock("@/lib/api/queries", () => ({ tokenQueries: { candles: vi.fn() } }));
vi.mock("./use-live-trades", () => ({ useLiveTrades: mocks.subscribe }));

const candle: Candle = { time: 120, open: 10, high: 12, low: 9, close: 11, volume: 100 };
const trade: Trade = {
  mint: "a",
  signature: "tx",
  side: "buy",
  trader: "wallet",
  time: 140,
  priceUsd: 15,
  tokenAmount: 2,
  amountUsd: 20,
};
const snapshot = (data: Candle[] | undefined, dataUpdatedAt = 1, isError = false) => ({
  data,
  dataUpdatedAt,
  isPending: !data && !isError,
  isError,
});
const emit = (value = trade) => act(() => mocks.subscribe.mock.lastCall?.[1](value));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("useLiveCandles", () => {
  it("merges live trades once and reports live prices", () => {
    mocks.query.mockReturnValue(snapshot([candle]));
    const onPrice = vi.fn();
    const { result } = renderHook(() => useLiveCandles("a", "1m", onPrice));
    emit();
    emit();
    expect(result.current.data[0]).toEqual({ ...candle, high: 15, close: 15, volume: 120 });
    expect(onPrice).toHaveBeenCalledWith(15);
  });
  it("discards merged state on fresh snapshots, mint and interval changes", () => {
    mocks.query.mockReturnValue(snapshot([candle]));
    const { result, rerender } = renderHook(
      ({ mint, interval }: { mint: string; interval: Interval }) => useLiveCandles(mint, interval),
      { initialProps: { mint: "a", interval: "1m" as Interval } },
    );
    emit();
    mocks.query.mockReturnValue(snapshot([{ ...candle, close: 12 }], 2));
    rerender({ mint: "a", interval: "1m" });
    expect(result.current.data[0].close).toBe(12);
    emit();
    rerender({ mint: "b", interval: "1m" });
    expect(result.current.data[0].close).toBe(12);
    emit({ ...trade, mint: "b" });
    rerender({ mint: "b", interval: "5m" });
    expect(result.current.data[0].close).toBe(12);
  });
  it("exposes loading, empty and error snapshots without inventing candles", () => {
    mocks.query.mockReturnValue(snapshot(undefined));
    const { result, rerender } = renderHook(() => useLiveCandles("a", "1m"));
    expect(result.current.isPending).toBe(true);
    emit();
    expect(result.current.data).toEqual([]);
    mocks.query.mockReturnValue(snapshot([], 2));
    rerender();
    expect(result.current.data).toEqual([]);
    mocks.query.mockReturnValue(snapshot(undefined, 3, true));
    rerender();
    expect(result.current.isError).toBe(true);
    expect(result.current.data).toEqual([]);
  });
});
