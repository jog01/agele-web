// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import type { PositionsWindow, RankedPosition } from "@/lib/api/positions-leaderboard";
import { LeaderboardView } from "./leaderboard-view";

vi.mock("next/navigation", () => ({
  usePathname: () => "/leaderboard",
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const position: RankedPosition = {
  rank: 1,
  trader: { wallet: "wallet", handle: "orca", displayName: "Orca Trader", avatarUrl: null },
  token: { mint: "mint", symbol: "SOL", name: "Solana", imageUrl: null },
  positionId: "first-episode",
  thesis: { id: "thesis-id", body: "Waited for the close.", createdAt: 100 },
  totalInvestedUsd: 500,
  realizedPnlUsd: 250,
  pnlPct: 50,
  avgEntryMarketCapUsd: 1_000_000,
  holdSeconds: 3_601,
  openedAt: 1,
  closedAt: 3_602,
  source: "demo",
};

function page(
  entries: RankedPosition[],
  nextCursor: string | null = null,
  { window = "all", source = "demo" }: { window?: PositionsWindow; source?: "demo" | "indexed" } = {},
) {
  return {
    data: { window, entries, nextCursor },
    response: new Response(null, { headers: { "X-Data-Source": source } }),
  };
}

function renderBoard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ui = createElement(QueryClientProvider, { client }, createElement(LeaderboardView));
  return { ...render(ui), ui };
}

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  window.history.replaceState(null, "", "/leaderboard?tab=positions&window=all");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("loads server-ranked pages and opens an exact position episode separately from the profile", async () => {
  const get = vi
    .spyOn(api, "GET")
    .mockResolvedValueOnce(page([position], "next-page"))
    .mockResolvedValueOnce(
      page([
        {
          ...position,
          rank: 2,
          positionId: "second-episode",
          thesis: null,
          trader: { ...position.trader, handle: "ray", displayName: null },
        },
      ]),
    );
  const view = renderBoard();
  expect(view.getByRole("status").textContent).toBe("Loading positions");
  expect(view.getByRole("link", { name: "Positions" }).getAttribute("aria-current")).toBe("page");
  expect(view.getByRole("link", { name: "Traders" }).getAttribute("href")).toBe("/leaderboard");
  expect(await view.findByText("Waited for the close.")).toBeDefined();
  expect(view.getByText("Demo fixtures")).toBeDefined();
  expect(view.getByText("Avg. entry MC $1M")).toBeDefined();
  expect(view.getByText("Invested $500 · Held 1h")).toBeDefined();
  expect(view.getByText("+50.00%")).toBeDefined();
  expect(view.getByRole("link", { name: "Orca Trader" }).getAttribute("href")).toBe("/traders/wallet");

  fireEvent.click(view.getByRole("button", { name: "Open Orca Trader's SOL position replay" }));
  const url = new URLSearchParams(window.location.search);
  expect(Object.fromEntries(url)).toMatchObject({
    tab: "positions",
    window: "all",
    trader: "wallet",
    mint: "mint",
    position: "first-episode",
    thesis: "thesis-id",
  });

  fireEvent.click(view.getByRole("button", { name: "Load more" }));
  expect(await view.findByRole("link", { name: "ray" })).toBeDefined();
  expect(view.getByRole("link", { name: "Orca Trader" })).toBeDefined();
  expect(view.queryByRole("button", { name: "Load more" })).toBeNull();
  expect(get).toHaveBeenNthCalledWith(2, "/v1/leaderboard/positions", {
    params: { query: expect.objectContaining({ window: "all", cursor: "next-page" }) },
    signal: expect.any(AbortSignal),
  });
});

it("fetches fresh server results when the window, invested bucket and hold range change", async () => {
  const get = vi.spyOn(api, "GET").mockResolvedValue(page([]));
  const view = renderBoard();
  expect(await view.findByText("No positions match these filters")).toBeDefined();

  fireEvent.click(view.getByRole("radio", { name: "30d" }));
  view.rerender(view.ui);
  expect(window.location.search).toBe("?tab=positions&window=30d");
  fireEvent.click(view.getByRole("radio", { name: "$100–$1K" }));
  const min = view.getByRole("slider", { name: "Minimum hold time" });
  const max = view.getByRole("slider", { name: "Maximum hold time" });
  fireEvent.focus(min);
  fireEvent.keyDown(min, { key: "ArrowRight" });
  fireEvent.focus(max);
  fireEvent.keyDown(max, { key: "ArrowLeft" });
  await waitFor(() =>
    expect(get).toHaveBeenLastCalledWith("/v1/leaderboard/positions", {
      params: {
        query: expect.objectContaining({
          window: "30d",
          invested: "100-1k",
          minHoldSeconds: 3_600,
          maxHoldSeconds: 2_592_000,
          cursor: undefined,
        }),
      },
      signal: expect.any(AbortSignal),
    }),
  );
});

it("allows the minimum hold time to reach 3m+ without setting a maximum", async () => {
  const get = vi.spyOn(api, "GET").mockResolvedValue(page([]));
  const view = renderBoard();
  await view.findByText("No positions match these filters");

  const min = view.getByRole("slider", { name: "Minimum hold time" });
  fireEvent.focus(min);
  fireEvent.keyDown(min, { key: "ArrowRight", shiftKey: true });

  expect(min.getAttribute("aria-valuetext")).toBe("3m+");
  expect(view.getByRole("slider", { name: "Maximum hold time" }).getAttribute("aria-valuetext")).toBe(
    "No maximum",
  );
  await waitFor(() =>
    expect(get).toHaveBeenLastCalledWith("/v1/leaderboard/positions", {
      params: { query: expect.objectContaining({ minHoldSeconds: 7_776_000, maxHoldSeconds: undefined }) },
      signal: expect.any(AbortSignal),
    }),
  );
});

it("defaults to 24h, shows closed losses, and labels demo entries in mixed results", async () => {
  window.history.replaceState(null, "", "/leaderboard?tab=positions");
  const get = vi.spyOn(api, "GET").mockResolvedValue(
    page(
      [
        { ...position, positionId: "indexed-episode", source: undefined },
        { ...position, rank: 2, realizedPnlUsd: -250, pnlPct: -50 },
      ],
      null,
      { window: "24h", source: "indexed" },
    ),
  );
  const view = renderBoard();
  expect(await view.findByText("-50.00%")).toBeDefined();
  expect(view.getByText("Includes demo fixtures")).toBeDefined();
  expect(view.getByText("Demo")).toBeDefined();
  expect(view.getByRole("radio", { name: "24h" }).getAttribute("aria-checked")).toBe("true");
  expect(get).toHaveBeenLastCalledWith("/v1/leaderboard/positions", {
    params: { query: expect.objectContaining({ window: "24h", invested: undefined }) },
    signal: expect.any(AbortSignal),
  });
});
