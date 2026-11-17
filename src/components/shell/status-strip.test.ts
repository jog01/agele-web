// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StatusStrip } from "./status-strip";

const { fetchTrending } = vi.hoisted(() => ({
  fetchTrending: vi
    .fn()
    .mockResolvedValue([{ mint: "sol-mint", symbol: "SOL", priceUsd: 100, priceChange24hPct: 2 }]),
}));
vi.mock("@/env", () => ({ env: { NEXT_PUBLIC_SOLANA_CLUSTER: "mainnet-beta" } }));
vi.mock("@/hooks/use-market-data-source", () => ({ useMarketDataSource: () => "mock" }));
vi.mock("@/lib/api/queries", () => ({
  tokenQueries: {
    trending: () => ({
      queryKey: ["tokens", "trending"],
      queryFn: fetchTrending,
      refetchInterval: 25,
    }),
  },
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("StatusStrip", () => {
  it("fetches and refreshes the ticker without a market page populating the cache", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    render(createElement(QueryClientProvider, { client }, createElement(StatusStrip)));

    expect((await screen.findByRole("link", { name: /SOL/ })).getAttribute("href")).toBe("/trade/sol-mint");
    await waitFor(() => expect(fetchTrending.mock.calls.length).toBeGreaterThan(1));
  });
});
