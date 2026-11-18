// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import type { Trade } from "@/lib/api/client";
import { ActivityPanel } from "./activity-panel";

const state = vi.hoisted(() => ({ source: "mock", trades: [] as Trade[], isError: false, isPending: false }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: state.trades, isPending: state.isPending, isError: state.isError }),
}));
vi.mock("@/lib/api/queries", () => ({
  tokenQueries: { trades: () => ({ queryKey: ["trades"] }) },
  useToken: () => ({ data: undefined }),
}));
vi.mock("@/hooks/use-market-data-source", () => ({ useMarketDataSource: () => state.source }));
vi.mock("@/hooks/use-live-trades", () => ({ useLiveTrades: () => {} }));
vi.mock("@/hooks/use-now", () => ({ useNow: () => 0 }));

const trade: Trade = {
  mint: "mint",
  signature: "fixture-signature",
  trader: "wallet",
  side: "buy",
  time: 1000,
  priceUsd: 1,
  amountUsd: 10,
  tokenAmount: 10,
};

afterEach(() => {
  cleanup();
  state.source = "mock";
  state.trades = [];
  state.isError = false;
  state.isPending = false;
});

it("shows table skeletons while trades are pending", () => {
  state.isPending = true;
  render(createElement(ActivityPanel, { mint: "mint" }));
  expect(screen.getByRole("status", { name: "Loading activity" })).toBeDefined();
  expect(screen.queryByText("No trades match these filters.")).toBeNull();
});

it("labels fixture transactions as demo without an explorer link", () => {
  state.trades = [trade];
  render(createElement(ActivityPanel, { mint: "mint" }));
  expect(screen.getByText("Demo")).toBeDefined();
  expect(screen.queryByRole("link", { name: /View transaction/ })).toBeNull();
});

it("keeps explorer links for live market transactions", () => {
  state.source = "live";
  state.trades = [trade];
  render(createElement(ActivityPanel, { mint: "mint" }));
  expect(screen.getByRole("link", { name: /View transaction/ }).getAttribute("href")).toBe(
    "https://solscan.io/tx/fixture-signature",
  );
  expect(screen.queryByText("Demo")).toBeNull();
});

it("keeps the empty trades state without transaction links", () => {
  render(createElement(ActivityPanel, { mint: "mint" }));
  expect(screen.getByText("No trades match these filters.")).toBeDefined();
  expect(screen.queryByRole("link", { name: /View transaction/ })).toBeNull();
});

it("keeps failed trades unavailable without transaction links", () => {
  state.isError = true;
  render(createElement(ActivityPanel, { mint: "mint" }));
  expect(screen.getByText("Trades unavailable.")).toBeDefined();
  expect(screen.queryByRole("link", { name: /View transaction/ })).toBeNull();
});
