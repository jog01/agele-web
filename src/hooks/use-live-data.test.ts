// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Token } from "@/lib/api/client";
import { tokenQueries } from "@/lib/api/queries";
import { useLiveLeaderboard } from "./use-live-leaderboard";
import { useLivePrices } from "./use-live-prices";

const { listeners, reconnects, subscribe } = vi.hoisted(() => {
  const listeners = new Map<string, (data: unknown) => void>();
  const reconnects = new Set<() => void>();
  return {
    listeners,
    reconnects,
    subscribe: vi.fn((topic: string, cb: (data: unknown) => void) => {
      listeners.set(topic, cb);
      return () => listeners.delete(topic);
    }),
  };
});

vi.mock("@/lib/realtime", () => ({
  realtime: {
    subscribe,
    onReconnect: (cb: () => void) => {
      reconnects.add(cb);
      return () => reconnects.delete(cb);
    },
  },
}));

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
  return { qc, wrapper };
}

describe("live data hooks", () => {
  it("merges ticks into both caches, ignores invalid/wrong-mint payloads, and re-snapshots on reconnect", () => {
    const { qc, wrapper } = setup();
    const token: Token = {
      mint: "a",
      symbol: "A",
      name: "A",
      decimals: 9,
      imageUrl: null,
      priceUsd: 1,
      marketCapUsd: 10,
      priceChange24hPct: 0,
      liquidityUsd: 0,
      volume24hUsd: 0,
      holders: 0,
    };
    qc.setQueryData(tokenQueries.detail("a").queryKey, token);
    qc.setQueryData(tokenQueries.trending().queryKey, [token]);
    const { rerender, unmount } = renderHook(({ mints }) => useLivePrices(mints), {
      wrapper,
      initialProps: { mints: ["a", "a"] },
    });
    const calls = subscribe.mock.calls.length;
    rerender({ mints: ["a"] });
    expect(subscribe).toHaveBeenCalledTimes(calls);
    const tick = { mint: "a", priceUsd: 2, marketCapUsd: 20, time: 100 };
    act(() => {
      listeners.get("token:a:price")?.(null);
      listeners.get("token:a:price")?.({ ...tick, mint: "b" });
    });
    expect(qc.getQueryData(tokenQueries.detail("a").queryKey)).toBe(token);
    act(() => listeners.get("token:a:price")?.(tick));
    expect(qc.getQueryData(tokenQueries.detail("a").queryKey)).toMatchObject({
      priceUsd: 2,
      marketCapUsd: 20,
    });
    expect(qc.getQueryData(tokenQueries.trending().queryKey)).toMatchObject([
      { priceUsd: 2, marketCapUsd: 20 },
    ]);
    act(() => {
      for (const cb of reconnects) cb();
    });
    expect(qc.getQueryState(tokenQueries.detail("a").queryKey)?.isInvalidated).toBe(true);
    expect(qc.getQueryState(tokenQueries.trending().queryKey)?.isInvalidated).toBe(true);
    unmount();
    expect(listeners.size).toBe(0);
    expect(reconnects.size).toBe(0);
    qc.clear();
  });

  it("invalidates only the signaled leaderboard window, all windows on reconnect, and cleans up", () => {
    const { qc, wrapper } = setup();
    for (const window of ["24h", "7d", "30d"]) qc.setQueryData(["leaderboard", window], { entries: [] });
    qc.setQueryData(["leaderboard", "7d", "viewer"], { entries: [] });
    const { unmount } = renderHook(() => useLiveLeaderboard(), { wrapper });
    act(() => listeners.get("leaderboard:global")?.({ window: "bogus", updatedAt: 1 }));
    expect(qc.getQueryState(["leaderboard", "24h"])?.isInvalidated).toBe(false);
    act(() => listeners.get("leaderboard:global")?.({ window: "7d", updatedAt: 1 }));
    expect(qc.getQueryState(["leaderboard", "7d"])?.isInvalidated).toBe(true);
    expect(qc.getQueryState(["leaderboard", "7d", "viewer"])?.isInvalidated).toBe(true);
    expect(qc.getQueryState(["leaderboard", "24h"])?.isInvalidated).toBe(false);
    act(() => {
      for (const cb of reconnects) cb();
    });
    for (const window of ["24h", "7d", "30d"]) {
      expect(qc.getQueryState(["leaderboard", window])?.isInvalidated).toBe(true);
    }
    unmount();
    expect(listeners.size).toBe(0);
    expect(reconnects.size).toBe(0);
    qc.clear();
  });
});
