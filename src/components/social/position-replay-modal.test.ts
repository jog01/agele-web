// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { traderPositionQuery } from "@/lib/api/traders";
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
      valueUsd: 4,
      realizedPnlUsd: null,
      time: 100,
    },
  ],
};
const originalUrl = window.location.href;

function openTrade(fillId: string) {
  window.history.replaceState(null, "", `?trader=wallet&mint=mint&fill=${fillId}`);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, gcTime: 0 } } });
  client.setQueryData(traderPositionQuery("wallet", "mint").queryKey, position);
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
