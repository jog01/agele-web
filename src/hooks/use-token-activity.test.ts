// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthState, demoAuth } from "@/components/auth/auth-context";
import { HoldersPanel, PositionsPanel, TradersPanel } from "@/components/terminal/token-activity-panels";
import { tokenQueries } from "@/lib/api/queries";
import type { components } from "@/lib/api/schema";
import { useTokenPosition, useTokenTraders } from "./use-token-activity";

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
const position: NonNullable<components["schemas"]["TokenPosition"]> = {
  mint: "mint",
  symbol: "SOL",
  quantity: 2,
  avgCostUsd: 100,
  priceUsd: 110,
  valueUsd: 220,
  unrealizedPnlUsd: 20,
  realizedPnlUsd: -5,
};
const trader: components["schemas"]["TokenTrader"] = {
  wallet: "wallet-a",
  handle: "alice",
  buys: 2,
  sells: 1,
  volumeUsd: 1000,
  realizedPnlUsd: -5,
  unrealizedPnlUsd: 20,
  pnlUsd: 15,
};
const clients: QueryClient[] = [];
function setup(initialAuth = signedIn) {
  let auth = initialAuth;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });
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
function ok(data: unknown, source = "indexed") {
  return { data, response: new Response(null, { headers: { "X-Data-Source": source } }) };
}
afterEach(() => {
  cleanup();
  for (const client of clients) client.clear();
  clients.length = 0;
  vi.resetAllMocks();
});

describe("token position queries", () => {
  it("does not fetch while signed out and uses the existing login action", () => {
    const login = vi.fn();
    const { wrapper } = setup({ ...demoAuth, configured: true, login });
    const view = render(createElement(PositionsPanel, { mint: "mint" }), { wrapper });
    fireEvent.click(view.getByRole("button", { name: "Sign in" }));
    expect(login).toHaveBeenCalledOnce();
    expect(get).not.toHaveBeenCalled();
  });

  it("explains disabled sign-in in demo mode", () => {
    const { wrapper } = setup(demoAuth);
    const view = render(createElement(PositionsPanel, { mint: "mint" }), { wrapper });
    expect(view.getByText("Sign-in is disabled in this demo build.")).toBeTruthy();
    expect(get).not.toHaveBeenCalled();
  });

  it.each([
    position,
    null,
    { ...position, quantity: 0, valueUsd: 0, unrealizedPnlUsd: 0, realizedPnlUsd: 80 },
  ])("preserves open, null and closed positions", async (value) => {
    get.mockResolvedValue(ok({ position: value }));
    const { wrapper } = setup();
    const { result } = renderHook(() => useTokenPosition("mint"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ position: value, dataSource: "indexed" });
    expect(get).toHaveBeenCalledWith("/v1/tokens/{mint}/positions", {
      params: { path: { mint: "mint" } },
      headers: { Authorization: "Bearer test-token" },
      signal: expect.any(AbortSignal),
    });
  });

  it("isolates viewers and mints and hides cached private data on logout", async () => {
    expect(tokenQueries.position("mint", signedIn).queryKey).not.toEqual(
      tokenQueries.position("mint", { ...signedIn, walletAddress: "viewer-b" }).queryKey,
    );
    expect(tokenQueries.position("mint", signedIn).queryKey).not.toEqual(
      tokenQueries.position("other", signedIn).queryKey,
    );
    get.mockResolvedValue(ok({ position }));
    const { wrapper, setAuth } = setup();
    const { result, rerender } = renderHook(() => useTokenPosition("mint"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    get.mockClear();
    setAuth(demoAuth);
    rerender();
    expect(result.current.data).toBeUndefined();
    expect(result.current.fetchStatus).toBe("idle");
    expect(get).not.toHaveBeenCalled();
  });

  it("fails closed before HTTP when the bearer is missing", async () => {
    const { wrapper } = setup({ ...signedIn, getAccessToken: async () => null });
    const { result } = renderHook(() => useTokenPosition("mint"), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(get).not.toHaveBeenCalled();
  });

  it("renders loading, signed PnL, closed and null states", async () => {
    let resolve!: (value: ReturnType<typeof ok>) => void;
    get.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { wrapper, qc } = setup();
    const view = render(createElement(PositionsPanel, { mint: "mint" }), { wrapper });
    expect(view.getByRole("status", { name: "Loading position" })).toBeTruthy();
    await act(async () => resolve(ok({ position })));
    await waitFor(() => expect(view.getByText("+$20.00")).toBeTruthy());
    expect(view.getByText("-$5.00").className).toBe("text-negative");
    expect(view.getByText("+$20.00").className).toBe("text-positive");
    act(() =>
      qc.setQueryData(tokenQueries.position("mint", signedIn).queryKey, {
        position: { ...position, quantity: 0, realizedPnlUsd: 80 },
        dataSource: "indexed",
      }),
    );
    await waitFor(() => expect(view.getByText("SOL · Closed position")).toBeTruthy());
    expect(view.getByText("+$80.00")).toBeTruthy();
    act(() =>
      qc.setQueryData(tokenQueries.position("mint", signedIn).queryKey, {
        position: null,
        dataSource: "indexed",
      }),
    );
    await waitFor(() => expect(view.getByText("No position in this token.")).toBeTruthy());
  });
});

describe("token traders", () => {
  it("fetches publicly, passes opaque cursors and stops on null", async () => {
    const cursor = "opaque:=/++";
    get
      .mockResolvedValueOnce(ok({ traders: [trader], nextCursor: cursor }))
      .mockResolvedValueOnce(ok({ traders: [{ ...trader, wallet: null, handle: "bob" }], nextCursor: null }));
    const { wrapper } = setup(demoAuth);
    const { result } = renderHook(() => useTokenTraders("mint"), { wrapper });
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
    expect(result.current.data?.pages.flatMap((page) => page.traders)).toHaveLength(2);
    expect(get.mock.calls.map((call) => call[1])).toEqual(
      [undefined, cursor].map((value) => ({
        params: { path: { mint: "mint" }, query: { limit: 25, cursor: value } },
        signal: expect.any(AbortSignal),
      })),
    );
    expect(tokenQueries.traders("mint").queryKey).not.toEqual(tokenQueries.traders("other").queryKey);
  });

  it("renders ranks, links and load more; preserves rows on a page error and retries", async () => {
    get.mockResolvedValueOnce(ok({ traders: [trader], nextCursor: "next" }));
    const { wrapper } = setup(demoAuth);
    const view = render(createElement(TradersPanel, { mint: "mint" }), { wrapper });
    expect(view.getByRole("status", { name: "Loading traders" })).toBeTruthy();
    await waitFor(() => expect(view.getByText("Indexed data")).toBeTruthy());
    expect(view.getByRole("link", { name: /alice/ }).getAttribute("href")).toBe(
      "https://solscan.io/account/wallet-a",
    );
    expect(view.getByText("+$15.00")).toBeTruthy();
    get.mockRejectedValue(new Error("offline"));
    fireEvent.click(view.getByRole("button", { name: "Load more" }));
    await waitFor(() => expect(view.getByRole("button", { name: "Retry load more" })).toBeTruthy());
    expect(view.getByText("+$15.00")).toBeTruthy();
    get.mockResolvedValue(ok({ traders: [{ ...trader, wallet: null, handle: "bob" }], nextCursor: null }));
    fireEvent.click(view.getByRole("button", { name: "Retry load more" }));
    await waitFor(() => expect(view.getByText("@bob")).toBeTruthy());
    expect(view.queryByRole("button", { name: "Load more" })).toBeNull();
    expect(view.getByText("2")).toBeTruthy();
  });

  it("handles an empty page without inventing indexed provenance", async () => {
    get.mockResolvedValue(ok({ traders: [], nextCursor: null }, "invalid"));
    const { wrapper } = setup();
    const view = render(createElement(TradersPanel, { mint: "mint" }), { wrapper });
    await waitFor(() => expect(view.getByText("No indexed traders for this token yet.")).toBeTruthy());
    expect(view.getByText("Data source unavailable")).toBeTruthy();
    expect(view.queryByRole("button", { name: "Load more" })).toBeNull();
  });
});

describe.each([PositionsPanel, TradersPanel])("panel errors", (Panel) => {
  it.each([404, 401, 503, "network"] as const)("handles %s without synthetic data", async (status) => {
    if (status === "network") get.mockRejectedValue(new Error("offline"));
    else
      get.mockResolvedValue({
        error: { error: { message: "Unavailable" } },
        response: new Response(null, { status }),
      });
    const { wrapper } = setup();
    const view = render(createElement(Panel, { mint: "mint" }), { wrapper });
    await waitFor(() => expect(view.getByRole("button", { name: "Retry" })).toBeTruthy());
    expect(
      view.getByText(status === 404 ? "Token not found." : /unavailable\. Please try again\./),
    ).toBeTruthy();
  });
});

describe("holders", () => {
  const holders: components["schemas"]["TokenHolders"] = {
    mint: "mint",
    scope: "all",
    totalHolders: 1000,
    top10Pct: 23.5,
    updatedAt: 1700000000,
    holders: [
      {
        rank: 1,
        wallet: "pool-wallet",
        amount: 150,
        pctSupply: 15,
        valueUsd: 300,
        isPool: true,
        label: "Raydium",
        trader: null,
        isFollowed: false,
        position: null,
        latestThesis: null,
      },
      {
        rank: 2,
        wallet: "user-wallet",
        amount: 85,
        pctSupply: 8.5,
        valueUsd: 170,
        isPool: false,
        label: "Raydium",
        trader: null,
        isFollowed: false,
        position: null,
        latestThesis: null,
      },
    ],
  };

  it("loads publicly with the capped limit and tags only actual pool holders", async () => {
    get.mockResolvedValue(ok(holders));
    const { wrapper } = setup(demoAuth);
    const view = render(createElement(HoldersPanel, { mint: "mint" }), { wrapper });
    expect(view.getByRole("status", { name: "Loading holders" })).toBeTruthy();
    await waitFor(() => expect(view.getByText("23.50%")).toBeTruthy());
    expect(view.getAllByText("Pool · Raydium")).toHaveLength(1);
    expect(view.getByText("1K")).toBeTruthy();
    expect(view.getByText("2023-11-14 22:13:20 UTC")).toBeTruthy();
    expect(view.getByRole("link", { name: "pool…llet" }).getAttribute("href")).toBe(
      "https://solscan.io/account/pool-wallet",
    );
    expect(get).toHaveBeenCalledWith("/v1/tokens/{mint}/holders", {
      params: { path: { mint: "mint" }, query: { limit: 20 } },
      signal: expect.any(AbortSignal),
    });
    expect(tokenQueries.holders("mint").queryKey).not.toEqual(tokenQueries.holders("other").queryKey);
  });

  it("shows a temporary-unavailable state on 502 and retries on demand", async () => {
    get.mockResolvedValueOnce({
      error: { error: { message: "RPC rate limit" } },
      response: new Response(null, { status: 502 }),
    });
    const { wrapper } = setup();
    const view = render(createElement(HoldersPanel, { mint: "mint" }), { wrapper });
    await waitFor(() => expect(view.getByText("Holder data temporarily unavailable.")).toBeTruthy());
    expect(get).toHaveBeenCalledTimes(1);
    get.mockResolvedValue(ok(holders));
    fireEvent.click(view.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(view.getByText("Pool · Raydium")).toBeTruthy());
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("handles an empty snapshot", async () => {
    get.mockResolvedValue(ok({ ...holders, holders: [], totalHolders: 0, top10Pct: 0 }));
    const { wrapper } = setup();
    const view = render(createElement(HoldersPanel, { mint: "mint" }), { wrapper });
    await waitFor(() => expect(view.getByText("No holder data for this token yet.")).toBeTruthy());
    expect(view.getByText("0.00%")).toBeTruthy();
  });

  it("distinguishes an unknown token from an upstream failure", async () => {
    get.mockResolvedValue({
      error: { error: { message: "Unknown mint" } },
      response: new Response(null, { status: 404 }),
    });
    const { wrapper } = setup();
    const view = render(createElement(HoldersPanel, { mint: "unknown" }), { wrapper });
    await waitFor(() => expect(view.getByText("Token not found.")).toBeTruthy());
    expect(view.getByRole("button", { name: "Retry" })).toBeTruthy();
  });

  it("sends combined filters to the server without offering Following to signed-out viewers", async () => {
    get.mockResolvedValue(ok({ ...holders, holders: [] }));
    const { wrapper } = setup(demoAuth);
    const view = render(createElement(HoldersPanel, { mint: "mint" }), { wrapper });
    await view.findByText("No holder data for this token yet.");
    expect(view.queryByRole("button", { name: "Following only" })).toBeNull();
    get.mockResolvedValue(ok({ ...holders, scope: "traders", holders: [] }));
    fireEvent.change(view.getByRole("combobox", { name: "Holder scope" }), { target: { value: "traders" } });
    await view.findByText("No Agele traders are holding this token.");
    fireEvent.click(view.getByRole("button", { name: "Thesis only" }));
    await view.findByText("No holders match these filters.");
    fireEvent.change(view.getByRole("combobox", { name: "Min size (USD)" }), { target: { value: "1000" } });
    await waitFor(() =>
      expect(get).toHaveBeenLastCalledWith("/v1/tokens/{mint}/holders", {
        params: {
          path: { mint: "mint" },
          query: { limit: 20, scope: "traders", thesisOnly: "true", minValueUsd: 1000 },
        },
        signal: expect.any(AbortSignal),
      }),
    );
    expect(view.getByRole("button", { name: "Thesis only" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("requests Following as the signed-in viewer and does not reuse it for a different viewer", async () => {
    get.mockResolvedValue(ok({ ...holders, holders: [] }));
    const { wrapper, setAuth } = setup();
    const view = render(createElement(HoldersPanel, { mint: "mint" }), { wrapper });
    await view.findByText("No holder data for this token yet.");
    fireEvent.click(view.getByRole("button", { name: "Following only" }));
    await view.findByText("No one you follow is holding");
    expect(get).toHaveBeenLastCalledWith("/v1/tokens/{mint}/holders", {
      params: { path: { mint: "mint" }, query: { limit: 20, followingOnly: "true" } },
      headers: { Authorization: "Bearer test-token" },
      signal: expect.any(AbortSignal),
    });
    setAuth({ ...signedIn, walletAddress: "viewer-b" });
    view.rerender(createElement(HoldersPanel, { mint: "mint" }));
    await view.findByText("No holder data for this token yet.");
    expect(view.getByRole("button", { name: "Following only" }).getAttribute("aria-pressed")).toBe("false");
    expect(get).toHaveBeenCalledTimes(3);
    expect(get).toHaveBeenLastCalledWith("/v1/tokens/{mint}/holders", {
      params: { path: { mint: "mint" }, query: { limit: 20 } },
      signal: expect.any(AbortSignal),
    });
  });

  it.each([true, false])("opens holder context (same position: %s)", async (samePosition) => {
    const enriched: (typeof holders.holders)[number] = {
      rank: 2,
      wallet: "user-wallet",
      amount: 85,
      pctSupply: 8.5,
      valueUsd: 170,
      trader: {
        wallet: "trader-wallet",
        handle: "alice",
        displayName: "Alice",
        avatarUrl: null,
        avgHoldSeconds: 15120,
        source: "demo",
      },
      position: {
        positionId: "position-a",
        avgEntryMarketCapUsd: 45_000,
        investedUsd: 100,
        realizedPnlUsd: 0,
        unrealizedPnlUsd: 70,
        pnlUsd: 70,
        pnlPct: 70,
        firstBoughtAt: 1699996400,
      },
      latestThesis: {
        thesisId: "thesis-a",
        postId: "post-a",
        positionId: samePosition ? "position-a" : "position-older",
        body: "Looking for a range reclaim.",
        createdAt: 1700000000,
        likeCount: 1,
        replyCount: 2,
        viewCount: 30,
      },
      isFollowed: false,
    };
    get
      .mockResolvedValueOnce(ok({ ...holders, holders: [enriched] }))
      .mockResolvedValueOnce(
        ok({ id: "thesis-a", comments: [], pinned: null, nextCursor: null, viewCount: 0 }),
      );
    const { wrapper } = setup(demoAuth);
    const view = render(createElement(HoldersPanel, { mint: "mint" }), { wrapper });
    const link = await view.findByRole("link", { name: "Alice" });
    expect(link.getAttribute("href")).toBe("/traders/trader-wallet");
    expect(view.getByText("@alice")).toBeTruthy();
    expect(view.getByText("4h 12m")).toBeTruthy();
    expect(view.getByText("$170.00")).toBeTruthy();
    expect(view.getByText("+$70.00")).toBeTruthy();
    expect(view.getByText("$45K")).toBeTruthy();
    expect(view.getByTitle("2023-11-14 21:13:20 UTC")).toBeTruthy();
    fireEvent.click(view.getByRole("button", { name: "Replay Alice's position" }));
    const replay = new URLSearchParams(window.location.search);
    expect(Object.fromEntries(replay)).toEqual({
      trader: "trader-wallet",
      mint: "mint",
      position: "position-a",
      ...(samePosition && { thesis: "thesis-a" }),
    });
    window.history.replaceState(null, "", window.location.pathname);
    const thesis = view.getByRole("button", { name: /Looking for a range reclaim/ });
    expect(thesis.textContent).toMatch(/ago.*Looking for a range reclaim.*1 like · 2 replies/);
    fireEvent.click(thesis);
    await view.findByRole("dialog");
    await waitFor(() =>
      expect(get).toHaveBeenLastCalledWith("/v1/tokens/{mint}/theses/{thesisId}", {
        params: { path: { mint: "mint", thesisId: "thesis-a" }, query: { cursor: undefined, limit: 25 } },
        headers: undefined,
        signal: expect.any(AbortSignal),
      }),
    );
  });
});
