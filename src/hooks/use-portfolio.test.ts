// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthState, demoAuth } from "@/components/auth/auth-context";
import { PortfolioView } from "@/components/portfolio/portfolio-view";
import type { Portfolio, UserTrade } from "@/lib/api/client";
import { leaderboardDataSource } from "@/lib/api/leaderboard";
import { portfolioQueries } from "@/lib/api/portfolio";
import { socialQueries } from "@/lib/api/queries";
import { usePortfolio, usePortfolioHistory, useUserTrades } from "./use-portfolio";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api: { GET: get },
}));

const signedIn: AuthState = {
  ...demoAuth,
  configured: true,
  authenticated: true,
  walletAddress: "viewer-a",
  getAccessToken: async () => "test-token",
};
const portfolio: Portfolio = {
  equityUsd: 1050,
  usdcBalance: 900,
  unrealizedPnlUsd: -5,
  realizedPnlUsd: 25,
  positions: [
    {
      mint: "mint",
      symbol: "TEST",
      imageUrl: null,
      quantity: 10,
      avgCostUsd: 15.5,
      priceUsd: 15,
      valueUsd: 150,
      unrealizedPnlUsd: -5,
      realizedPnlUsd: 25,
    },
  ],
};
const buy: UserTrade = {
  id: "buy",
  signature: "sig-buy",
  mint: "mint",
  symbol: "TEST",
  imageUrl: null,
  side: "buy",
  tokenAmount: 10,
  priceUsd: 15.5,
  valueUsd: 155,
  realizedPnlUsd: null,
  time: 1700000000,
};
const sell: UserTrade = {
  ...buy,
  id: "sell",
  signature: "sig-sell",
  side: "sell",
  realizedPnlUsd: -2,
  time: 1699999999,
};
const clients: QueryClient[] = [];
function setup(initialAuth = signedIn) {
  let auth = initialAuth;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(qc);
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(AuthContext, { value: auth }, children));
  return {
    qc,
    wrapper,
    setAuth: (next: AuthState) => {
      auth = next;
    },
  };
}
function ok(data: unknown, source?: string) {
  return {
    data,
    response: new Response(null, { status: 200, headers: source ? { "X-Data-Source": source } : undefined }),
  };
}
function useAllPortfolioQueries() {
  return { summary: usePortfolio(), history: usePortfolioHistory("7d"), trades: useUserTrades() };
}

afterEach(() => {
  cleanup();
  for (const qc of clients) qc.clear();
  clients.length = 0;
  get.mockReset();
});

describe("portfolio queries", () => {
  it.each([demoAuth, { ...signedIn, walletAddress: null, userLabel: null }])(
    "does not fetch without an authenticated viewer",
    (auth) => {
      const { wrapper } = setup(auth);
      const { result } = renderHook(useAllPortfolioQueries, { wrapper });
      for (const query of Object.values(result.current)) expect(query.fetchStatus).toBe("idle");
      expect(get).not.toHaveBeenCalled();
    },
  );

  it("loads actual metrics with a bearer token", async () => {
    get.mockResolvedValue(ok(portfolio));
    const { wrapper } = setup();
    const { result } = renderHook(usePortfolio, { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(portfolio);
    expect(get).toHaveBeenCalledWith("/v1/me/portfolio", {
      headers: { Authorization: "Bearer test-token" },
      signal: expect.any(AbortSignal),
    });
  });

  it.each(["7d", "30d", "all"] as const)(
    "preserves %s history including its final live-equity point",
    async (range) => {
      const history = {
        points: [
          { time: 100, valueUsd: 900 },
          { time: 200, valueUsd: portfolio.equityUsd },
        ],
      };
      get.mockResolvedValue(ok(history));
      const { wrapper } = setup();
      const { result } = renderHook(() => usePortfolioHistory(range), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(history);
      expect(get).toHaveBeenCalledWith("/v1/me/portfolio/history", {
        params: { query: { range } },
        headers: { Authorization: "Bearer test-token" },
        signal: expect.any(AbortSignal),
      });
    },
  );

  it("preserves opaque cursors, null buy PnL, sell PnL, and unix seconds; stops on null", async () => {
    const cursor = "opaque:=/++";
    get
      .mockResolvedValueOnce(ok({ trades: [buy], nextCursor: cursor }))
      .mockResolvedValueOnce(ok({ trades: [sell], nextCursor: null }));
    const { wrapper } = setup();
    const { result } = renderHook(useUserTrades, { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
    expect(result.current.data?.pages.flatMap((page) => page.trades)).toEqual([buy, sell]);
    expect(get.mock.calls.map((call) => call[1].params.query)).toEqual([
      { limit: 25, cursor: undefined },
      { limit: 25, cursor },
    ]);
    for (const call of get.mock.calls)
      expect(call[1].headers).toEqual({ Authorization: "Bearer test-token" });
  });

  it("handles an empty final trade page and empty history", async () => {
    get.mockImplementation(async (path: string) =>
      ok(path.endsWith("history") ? { points: [] } : { trades: [], nextCursor: null }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => ({ trades: useUserTrades(), history: usePortfolioHistory("all") }), {
      wrapper,
    });
    await waitFor(() =>
      expect(result.current.trades.isSuccess && result.current.history.isSuccess).toBe(true),
    );
    expect(result.current.trades.hasNextPage).toBe(false);
    expect(result.current.trades.data?.pages[0].trades).toEqual([]);
    expect(result.current.history.data?.points).toEqual([]);
  });

  it.each(["network", 401, 503] as const)("surfaces %s errors without inventing data", async (failure) => {
    if (failure === "network") get.mockRejectedValue(new Error("offline"));
    else
      get.mockResolvedValue({
        error: { error: { message: "Unavailable" } },
        response: new Response(null, { status: failure }),
      });
    const { wrapper } = setup();
    const { result } = renderHook(useAllPortfolioQueries, { wrapper });
    await waitFor(() => {
      for (const query of Object.values(result.current)) expect(query.isError).toBe(true);
    });
    for (const query of Object.values(result.current)) expect(query.data).toBeUndefined();
  });

  it("does not send requests when the access token is missing", async () => {
    const { wrapper } = setup({ ...signedIn, getAccessToken: async () => null });
    const { result } = renderHook(useAllPortfolioQueries, { wrapper });
    await waitFor(() => {
      for (const query of Object.values(result.current)) expect(query.isError).toBe(true);
    });
    expect(get).not.toHaveBeenCalled();
  });

  it("isolates each viewer and range; hides private data on logout", async () => {
    const other = { ...signedIn, walletAddress: "viewer-b" };
    expect(portfolioQueries.summary(signedIn).queryKey).not.toEqual(portfolioQueries.summary(other).queryKey);
    expect(portfolioQueries.history("7d", signedIn).queryKey).not.toEqual(
      portfolioQueries.history("7d", other).queryKey,
    );
    expect(portfolioQueries.history("7d", signedIn).queryKey).not.toEqual(
      portfolioQueries.history("30d", signedIn).queryKey,
    );
    expect(portfolioQueries.trades(signedIn).queryKey).not.toEqual(portfolioQueries.trades(other).queryKey);
    get.mockResolvedValue(ok(portfolio));
    const { wrapper, setAuth } = setup();
    const { result, rerender } = renderHook(usePortfolio, { wrapper });
    await waitFor(() => expect(result.current.data).toEqual(portfolio));
    get.mockClear();
    setAuth(demoAuth);
    rerender();
    expect(result.current.data).toBeUndefined();
    expect(result.current.fetchStatus).toBe("idle");
    expect(get).not.toHaveBeenCalled();
  });
});

describe("existing portfolio markup", () => {
  it("retains the signed-out sign-in state with dashes instead of fabricated balances", () => {
    const { wrapper } = setup({ ...demoAuth, configured: true });
    const view = render(createElement(PortfolioView), { wrapper });
    expect(view.getByRole("button", { name: "Sign in" })).toBeTruthy();
    expect(view.getAllByText("—")).toHaveLength(4);
    expect(get).not.toHaveBeenCalled();
  });

  it("renders API metrics in the existing cards", async () => {
    get.mockResolvedValue(ok(portfolio));
    const { wrapper } = setup();
    const view = render(createElement(PortfolioView), { wrapper });
    await waitFor(() => expect(view.getByText("$1,050.00")).toBeTruthy());
    expect(view.getByText("$900.00")).toBeTruthy();
    expect(view.getByText("-$5.00")).toBeTruthy();
    expect(view.getByText("$25.00")).toBeTruthy();
    expect(view.queryByText("Your portfolio starts here")).toBeNull();
  });

  it("shows real zeros for an empty portfolio", async () => {
    get.mockResolvedValue(
      ok({ equityUsd: 0, usdcBalance: 0, unrealizedPnlUsd: 0, realizedPnlUsd: 0, positions: [] }),
    );
    const { wrapper } = setup();
    const view = render(createElement(PortfolioView), { wrapper });
    await waitFor(() => expect(view.getAllByText("$0.00")).toHaveLength(4));
    expect(view.getByText("Your portfolio starts here")).toBeTruthy();
  });

  it("shows unavailable metrics on errors", async () => {
    get.mockRejectedValue(new Error("offline"));
    const { wrapper } = setup();
    const view = render(createElement(PortfolioView), { wrapper });
    await waitFor(() => expect(view.getByText("Portfolio unavailable")).toBeTruthy());
    expect(view.getAllByText("—")).toHaveLength(4);
  });
});

describe("leaderboard provenance", () => {
  it.each(["demo", "indexed", "invalid", "DEMO", "", null])("parses header %s conservatively", (source) => {
    const headers = new Headers(source === null ? undefined : { "x-data-source": source });
    expect(leaderboardDataSource(headers)).toBe(
      source === "demo" || source === "indexed" ? source : "unknown",
    );
  });

  it.each(["demo", "indexed"])("exposes the %s header alongside rankings", async (source) => {
    get.mockResolvedValue(ok({ window: "7d", entries: [] }, source));
    const { qc } = setup();
    const data = await qc.fetchQuery(socialQueries.leaderboard("7d"));
    expect(data).toEqual({ window: "7d", entries: [], dataSource: source });
  });
});
