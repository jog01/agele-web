// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import type { Candle, Comment } from "@/lib/api/client";
import type { TraderPosition } from "@/lib/position-replay";
import { PositionReplayChart } from "./position-replay-chart";

const { createMarkers } = vi.hoisted(() => ({ createMarkers: vi.fn() }));

vi.mock("lightweight-charts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("lightweight-charts")>()),
  createChart: () => ({
    addSeries: () => ({ setData: vi.fn(), createPriceLine: vi.fn() }),
    timeScale: () => ({ fitContent: vi.fn() }),
    remove: vi.fn(),
  }),
  createSeriesMarkers: createMarkers,
}));

const close = 86_399;
const position: TraderPosition = {
  id: "episode",
  wallet: "wallet",
  mint: "mint",
  symbol: "TOK",
  imageUrl: null,
  openedAt: 86_000,
  closedAt: close,
  quantity: 0,
  avgEntryUsd: 4,
  avgCostUsd: 4,
  priceUsd: 5,
  priceSinceFirstBuyPct: 25,
  valueUsd: 0,
  realizedPnlUsd: 1,
  unrealizedPnlUsd: 0,
  fills: [
    {
      id: "exit",
      signature: "exit",
      mint: "mint",
      symbol: "TOK",
      imageUrl: null,
      side: "sell",
      tokenAmount: 1,
      priceUsd: 5,
      valueUsd: 5,
      realizedPnlUsd: 1,
      time: close,
    },
  ],
};
const thesis: Comment = {
  id: "post",
  body: "I exited.",
  handle: "trader",
  avatarUrl: null,
  imageUrl: null,
  source: "indexed",
  mint: "mint",
  symbol: "TOK",
  position: "short",
  createdAt: close + 1800,
  kind: "thesis",
  wallet: "wallet",
  thesisId: "thesis",
  parentId: null,
  discussionKey: null,
  pinned: false,
  likes: 0,
  replyCount: 0,
};
const candle = (time: number): Candle => ({ time, open: 4, high: 5, low: 4, close: 5, volume: 1 });

afterEach(() => {
  cleanup();
  createMarkers.mockClear();
});

it("shows a thesis posted 30 minutes after close in every replay range", () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, gcTime: 0 } } });
  client.setQueryData(["tokens", "mint", "candles", "1h"], [candle(82_800)]);
  client.setQueryData(["tokens", "mint", "candles", "4h"], []);
  client.setQueryData(["tokens", "mint", "candles", "1d"], [candle(0), candle(86_400)]);
  render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(PositionReplayChart, {
        position,
        supply: null,
        theses: [thesis],
      }),
    ),
  );

  const expectThesisMarkerAt = (time: number) =>
    expect(createMarkers).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.arrayContaining([expect.objectContaining({ text: "T", time })]),
    );

  expectThesisMarkerAt(82_800);
  fireEvent.click(screen.getByRole("button", { name: "1M" }));
  expectThesisMarkerAt(close);
  fireEvent.click(screen.getByRole("button", { name: "ALL" }));
  expectThesisMarkerAt(86_400);
  client.clear();
});
