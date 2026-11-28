// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { positionThesisQuery } from "@/lib/api/social";
import { positionTransactionsQuery, traderPositionQuery } from "@/lib/api/traders";
import type { TraderPosition } from "@/lib/position-replay";
import { PositionReplayModal } from "./position-replay-modal";

const { writeText } = vi.hoisted(() => ({ writeText: vi.fn().mockResolvedValue(undefined) }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
vi.mock("./position-replay-chart", () => ({ PositionReplayChart: () => null }));

const position: TraderPosition = {
  id: "latest",
  wallet: "wallet",
  mint: "mint",
  symbol: "TOK",
  imageUrl: null,
  openedAt: 100,
  closedAt: null,
  quantity: 1,
  avgEntryUsd: 4,
  avgEntryMarketCapUsd: 1_500_000,
  avgExitMarketCapUsd: null,
  totalInvestedUsd: 42,
  pnlPct: 2.38,
  avgCostUsd: 4,
  priceUsd: 5,
  priceSinceFirstBuyPct: 25,
  valueUsd: 5,
  realizedPnlUsd: 0,
  unrealizedPnlUsd: 1,
  fills: [
    {
      id: "latest-fill",
      signature: "latest-fill",
      mint: "mint",
      symbol: "TOK",
      imageUrl: null,
      side: "buy",
      tokenAmount: 1,
      priceUsd: 4,
      marketCapUsd: 1_500_000,
      valueUsd: 4,
      realizedPnlUsd: null,
      time: 100,
    },
  ],
};
const originalUrl = window.location.href;

function openTrade(fillId: string, { lookupThesis = false, discussionKey = "" } = {}) {
  const params = new URLSearchParams({ trader: "wallet", mint: "mint" });
  if (discussionKey) {
    params.set("position", position.id);
    params.set("discussion", discussionKey);
  } else {
    params.set("fill", fillId);
  }
  window.history.replaceState(null, "", `?${params}`);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, gcTime: 0 } } });
  client.setQueryData(
    traderPositionQuery("wallet", "mint", params.get("position") ?? undefined).queryKey,
    discussionKey ? { ...position, closedAt: 200 } : position,
  );
  if (!lookupThesis) client.setQueryData(positionThesisQuery("wallet", "mint", "latest").queryKey, null);
  client.setQueryData(
    positionTransactionsQuery("wallet", "mint", "latest", { page: 1, limit: 6, minSizeUsd: 0 }).queryKey,
    { positionId: "latest", total: 7, totalInvestedUsd: 42, nextPage: 2, transactions: position.fills },
  );
  client.setQueryData(["tokens", "mint"], { mint: "mint" });
  client.setQueryData(["trader", "anonymous", "wallet"], { handle: "Trader" });
  render(createElement(QueryClientProvider, { client }, createElement(PositionReplayModal)));
  return screen.getByRole<HTMLButtonElement>("button", { name: "Share" });
}

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", originalUrl);
  Reflect.deleteProperty(navigator, "clipboard");
  writeText.mockClear();
  vi.restoreAllMocks();
});

it("does not share a latest episode that lacks the selected older trade", () => {
  const share = openTrade("older-fill");
  expect(screen.getByRole("alert").textContent).toContain("This fill isn’t in the latest position episode.");
  expect(share.disabled).toBe(true);
  fireEvent.click(share);
  expect(writeText).not.toHaveBeenCalled();
});

it("pins a replay link when the selected trade is in the loaded episode", () => {
  const share = openTrade("latest-fill");
  expect(share.disabled).toBe(false);
  fireEvent.click(share);
  const url = new URL(writeText.mock.calls[0]?.[0]);
  expect(url.searchParams.get("position")).toBe("latest");
  expect(url.searchParams.get("fill")).toBe("latest-fill");
});

it("finds a closed position's exact thesis without hiding the closing trade's replies", async () => {
  const comment = {
    id: "thesis-version",
    thesisId: "linked-thesis",
    kind: "thesis",
    wallet: "wallet",
    mint: "mint",
    handle: "Trader",
    avatarUrl: null,
    body: "Thesis for this exact episode.",
    position: "long",
    createdAt: 100,
  };
  const get = vi
    .spyOn(api, "GET")
    .mockImplementation(async (path: string, options?: { params?: { query?: { cursor?: string } } }) => {
      const response = new Response();
      switch (path) {
        case "/v1/feed":
          return {
            response,
            data: options?.params?.query?.cursor
              ? { items: [{ ...comment, positionId: "latest" }], nextCursor: null }
              : {
                  items: [{ ...comment, positionId: "older", thesisId: "other" }],
                  nextCursor: "older-theses",
                },
          };
        case "/v1/tokens/{mint}/theses/{thesisId}":
          return {
            response,
            data: {
              wallet: "wallet",
              positionId: "latest",
              pinned: null,
              comments: [comment],
              nextCursor: null,
            },
          };
        case "/v1/feed/{key}/comments":
          return {
            response,
            data: {
              comments: [{ id: "closing-reply", handle: "trader", body: "Reply to the closing trade." }],
              nextCursor: null,
            },
          };
        default:
          throw new Error(`Unexpected request: ${path}`);
      }
    });

  openTrade("latest-fill", { lookupThesis: true, discussionKey: "trade:closing-fill" });
  expect(await screen.findByText(comment.body)).toBeDefined();
  expect(await screen.findByText("Reply to the closing trade.")).toBeDefined();
  expect(get).toHaveBeenCalledTimes(4);
  for (const cursor of [undefined, "older-theses"]) {
    expect(get).toHaveBeenCalledWith("/v1/feed", {
      params: {
        query: { scope: "global", wallet: "wallet", mint: "mint", types: "thesis", cursor, limit: 25 },
      },
      signal: expect.any(AbortSignal),
    });
  }
  expect(get).toHaveBeenCalledWith(
    "/v1/tokens/{mint}/theses/{thesisId}",
    expect.objectContaining({
      params: { path: { mint: "mint", thesisId: "linked-thesis" }, query: { cursor: undefined, limit: 25 } },
    }),
  );
  expect(get).toHaveBeenCalledWith(
    "/v1/feed/{key}/comments",
    expect.objectContaining({
      params: { path: { key: "trade:closing-fill" }, query: { cursor: undefined, limit: 25 } },
    }),
  );
});

it("shows the server metrics and requests new transaction pages and minimum sizes for the episode", async () => {
  const get = vi
    .spyOn(api, "GET")
    .mockResolvedValueOnce({
      response: new Response(),
      data: {
        positionId: "latest",
        total: 7,
        nextPage: null,
        totalInvestedUsd: 42,
        transactions: [
          { ...position.fills[0], id: "other-fill", tokenAmount: 3, priceUsd: 6, marketCapUsd: null },
        ],
      },
    })
    .mockResolvedValueOnce({
      response: new Response(),
      data: { positionId: "latest", total: 0, nextPage: null, totalInvestedUsd: 42, transactions: [] },
    });
  openTrade("latest-fill");
  expect(screen.getByText("Avg. entry MC").nextElementSibling?.textContent).toBe("$1.5M");
  expect(screen.getByText("Avg. exit MC").nextElementSibling?.textContent).toBe("—");
  expect(screen.getByText("Total invested").nextElementSibling?.textContent).toBe("$42.00");
  expect(screen.getByText("+2.38%")).toBeDefined();
  expect(screen.getByText("1 at $1.5M MC")).toBeDefined();

  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(await screen.findByText("3 at $6.00")).toBeDefined();
  fireEvent.change(screen.getByRole("spinbutton", { name: "Minimum fill size in USD" }), {
    target: { value: "100" },
  });
  expect(await screen.findByText("No fills meet the minimum size.")).toBeDefined();
  for (const [index, page, minSizeUsd] of [
    [1, 2, 0],
    [2, 1, 100],
  ]) {
    expect(get).toHaveBeenNthCalledWith(index, "/v1/traders/{wallet}/positions/{mint}/transactions", {
      params: {
        path: { wallet: "wallet", mint: "mint" },
        query: { positionId: "latest", page, limit: 6, minSizeUsd },
      },
      signal: expect.any(AbortSignal),
    });
  }
});

it("can retry a failed page without losing the replay", async () => {
  const get = vi
    .spyOn(api, "GET")
    .mockResolvedValueOnce({
      response: new Response(null, { status: 404 }),
      error: { error: { message: "Position not found" } },
    })
    .mockResolvedValueOnce({
      response: new Response(),
      data: {
        positionId: "latest",
        total: 7,
        nextPage: null,
        totalInvestedUsd: 42,
        transactions: position.fills,
      },
    });
  openTrade("latest-fill");
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Couldn’t load transactions.");
  expect(screen.getByText("Total invested").nextElementSibling?.textContent).toBe("$42.00");
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("1 at $1.5M MC")).toBeDefined();
  expect(get).toHaveBeenCalledTimes(2);
});
