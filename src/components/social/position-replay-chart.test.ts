// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import type { Candle, Comment } from "@/lib/api/client";
import type { TraderPosition } from "@/lib/position-replay";
import { PositionReplayChart } from "./position-replay-chart";

const { createMarkers, createPriceLine } = vi.hoisted(() => ({
  createMarkers: vi.fn(),
  createPriceLine: vi.fn(),
}));

vi.mock("lightweight-charts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("lightweight-charts")>()),
  createChart: () => ({
    addSeries: () => ({ setData: vi.fn(), createPriceLine }),
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
  avgEntryMarketCapUsd: 400,
  avgExitMarketCapUsd: 500,
  totalInvestedUsd: 4,
  pnlPct: 25,
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
      marketCapUsd: 500,
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
  viewCount: 0,
  likes: 0,
  replyCount: 0,
};
const candle = (time: number): Candle => ({ time, open: 4, high: 5, low: 4, close: 5, volume: 1 });

afterEach(() => {
  cleanup();
  createMarkers.mockClear();
  createPriceLine.mockClear();
});

it.each([400, null])("scales the entry line like the series with historical MC %s", (entryMc) => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, gcTime: 0 } } });
  client.setQueryData(["tokens", "mint", "candles", "1h"], [candle(82_800)]);
  render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(PositionReplayChart, {
        position: { ...position, avgEntryMarketCapUsd: entryMc },
        supply: 250,
        theses: [],
      }),
    ),
  );

  expect(createPriceLine).toHaveBeenLastCalledWith(expect.objectContaining({ price: 1000 }));
  fireEvent.click(screen.getByRole("button", { name: "MCap" }));
  expect(createPriceLine).toHaveBeenLastCalledWith(expect.objectContaining({ price: 4 }));
  client.clear();
});

it("shows a thesis posted 30 minutes after close in every replay range", () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, gcTime: 0 } } });
  client.setQueryData(["tokens", "mint", "candles", "1h"], [candle(82_800), candle(86_400)]);
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

  expectThesisMarkerAt(86_400);
  fireEvent.click(screen.getByRole("button", { name: "1M" }));
  expectThesisMarkerAt(close);
  fireEvent.click(screen.getByRole("button", { name: "ALL" }));
  expectThesisMarkerAt(86_400);
  client.clear();
});

it("does not place a thesis on a candle two days before publication", () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, gcTime: 0 } } });
  const oldCandle = 86_400;
  const exitCandle = oldCandle + 2 * 86_400;
  const exit = exitCandle + 1;
  client.setQueryData(["tokens", "mint", "candles", "1h"], [candle(oldCandle), candle(exitCandle)]);
  render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(PositionReplayChart, {
        position: {
          ...position,
          openedAt: oldCandle,
          closedAt: exit,
          fills: position.fills.map((fill) => ({ ...fill, time: exit })),
        },
        supply: null,
        theses: [{ ...thesis, createdAt: exitCandle - 1 }],
      }),
    ),
  );

  expect(createMarkers).toHaveBeenLastCalledWith(expect.anything(), [
    expect.objectContaining({ text: "S", time: exitCandle }),
  ]);
  client.clear();
});
