// @vitest-environment jsdom
import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { expect, it, vi } from "vitest";
import { fetchPulse, type PulseSnapshot, type PulseToken } from "@/lib/api/pulse";
import { usePulse } from "./use-pulse";

const channel = vi.hoisted(() => ({
  send: (_event: unknown) => {},
}));
vi.mock("@/lib/realtime", () => ({
  realtime: {
    subscribe: (_topic: string, callback: typeof channel.send) => {
      channel.send = callback;
      return () => {};
    },
    onReconnect: () => () => {},
  },
}));
vi.mock("@/lib/api/pulse", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/pulse")>()),
  fetchPulse: vi.fn(),
}));

const token: PulseToken = {
  mint: "So11111111111111111111111111111111111111112",
  symbol: "SOL",
  name: "Solana",
  imageUrl: null,
  creator: "creator",
  stage: "new",
  venue: "pump.fun",
  launchedAt: 271,
  curveProgressBps: 1_500,
  migratedAt: null,
  migratedVenue: null,
  priceUsd: 1,
  marketCapUsd: 8_200,
  volume24hUsd: 2_400,
  liquidityUsd: 400,
  holders: 12,
  txCount24h: 14,
  buys24h: 10,
  sells24h: 4,
};

it("refreshes the snapshot on schedule even when upserts arrive every second", async () => {
  vi.useFakeTimers();
  focusManager.setFocused(true);
  const snapshot: PulseSnapshot = { source: "demo", new: [token], finalStretch: [], migrated: [] };
  vi.mocked(fetchPulse).mockResolvedValue(snapshot);
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  const { unmount } = renderHook(usePulse, { wrapper });
  try {
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(fetchPulse).toHaveBeenCalledTimes(1);
    for (let second = 1; second <= 14; second++) {
      await act(async () => vi.advanceTimersByTimeAsync(1000));
      act(() => channel.send({ type: "upsert", stage: "new", token: { ...token, holders: second } }));
    }
    expect(fetchPulse).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(fetchPulse).toHaveBeenCalledTimes(2);
  } finally {
    unmount();
    client.clear();
    focusManager.setFocused(undefined);
    vi.useRealTimers();
  }
});
