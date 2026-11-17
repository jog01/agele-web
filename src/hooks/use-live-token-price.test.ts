// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Token, Trade } from "@/lib/api/client";
import { mergeTokenPrice } from "@/lib/api/live-data";
import { useLiveTokenPrice } from "./use-live-token-price";

const { stream } = vi.hoisted(() => ({ stream: { onTrade: (_trade: Trade) => {} } }));
vi.mock("./use-live-trades", () => ({
  useLiveTrades: (_mint: string, onTrade: (trade: Trade) => void) => {
    stream.onTrade = onTrade;
  },
}));

describe("useLiveTokenPrice", () => {
  it("reacts to newer cached ticks and trades without letting older trades or another mint take over", () => {
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
    const trade: Trade = {
      mint: "a",
      signature: "tx",
      trader: "wallet",
      side: "buy",
      time: 99,
      priceUsd: 2,
      tokenAmount: 1,
      amountUsd: 2,
    };
    const { result, rerender, unmount } = renderHook(({ mint, token }) => useLiveTokenPrice(mint, token), {
      initialProps: { mint: "a", token: token as Token | undefined },
    });
    expect(result.current).toBe(1);
    act(() => stream.onTrade(trade));
    expect(result.current).toBe(2);
    const updated = mergeTokenPrice(token, { mint: "a", priceUsd: 3, marketCapUsd: 30, time: 100 });
    rerender({ mint: "a", token: updated });
    expect(result.current).toBe(3);
    act(() => stream.onTrade({ ...trade, time: 101, priceUsd: 4 }));
    expect(result.current).toBe(4);
    act(() => stream.onTrade(trade));
    expect(result.current).toBe(4);
    rerender({ mint: "b", token: undefined });
    expect(result.current).toBeNull();
    unmount();
  });
});
