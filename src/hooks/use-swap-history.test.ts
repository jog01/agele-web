// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { AuthContext, type AuthState, demoAuth } from "@/components/auth/auth-context";
import { SwapHistoryPanel } from "@/components/terminal/swap-history-panel";
import { solanaCluster } from "@/lib/solana/cluster";
import { type SwapHistoryItem, swapHistoryKey } from "@/lib/swap-history";
import { useSwapHistory } from "./use-swap-history";

const mocks = vi.hoisted(() => ({ get: vi.fn(), reconnect: vi.fn(), off: vi.fn() }));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api: { GET: mocks.get },
}));
vi.mock("@/lib/realtime", () => ({ realtime: { onReconnect: mocks.reconnect } }));

const auth: AuthState = {
  ...demoAuth,
  configured: true,
  authenticated: true,
  walletAddress: "viewer-a",
  getAccessToken: async () => "token-a",
};
const item: SwapHistoryItem = {
  requestId: "one",
  inputMint: solanaCluster().usdcMint,
  outputMint: "token",
  inAmount: "1000000",
  outAmount: "1234567891",
  status: "confirmed",
  signature: "sig",
  createdAt: "2026-01-01T00:00:00Z",
};
const clients: QueryClient[] = [];
const ok = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) });
function setup(initialAuth = auth) {
  let current = initialAuth;
  mocks.reconnect.mockReturnValue(mocks.off);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(qc);
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client: qc },
      createElement(AuthContext, { value: current }, children),
    );
  return {
    qc,
    wrapper,
    setAuth: (next: AuthState) => {
      current = next;
    },
  };
}
afterEach(() => {
  cleanup();
  for (const qc of clients) qc.clear();
  clients.length = 0;
  vi.clearAllMocks();
  mocks.get.mockReset();
});

it("only fetches with an authenticated viewer", () => {
  const { wrapper } = setup(demoAuth);
  const { result } = renderHook(useSwapHistory, { wrapper });
  expect(result.current.fetchStatus).toBe("idle");
  expect(mocks.get).not.toHaveBeenCalled();
});

it("passes the opaque cursor unchanged, sends auth and stops on null", async () => {
  const cursor = "opaque:/+=?";
  mocks.get
    .mockResolvedValueOnce(ok({ items: [item], nextCursor: cursor }))
    .mockResolvedValueOnce(ok({ items: [{ ...item, requestId: "older" }], nextCursor: null }));
  const { wrapper } = setup();
  const { result } = renderHook(useSwapHistory, { wrapper });
  await waitFor(() => expect(result.current.items).toHaveLength(1));
  await act(() => result.current.fetchNextPage());
  await waitFor(() => expect(result.current.items.map((item) => item.requestId)).toEqual(["one", "older"]));
  expect(result.current.hasNextPage).toBe(false);
  expect(mocks.get).toHaveBeenLastCalledWith("/v1/swaps", {
    params: { query: { limit: 25, cursor } },
    headers: { Authorization: "Bearer token-a" },
    signal: expect.any(AbortSignal),
  });
});

it("fails closed without an access token", async () => {
  const { wrapper } = setup({ ...auth, getAccessToken: async () => null });
  const { result } = renderHook(useSwapHistory, { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(mocks.get).not.toHaveBeenCalled();
});

it("preserves loaded pages on pagination errors and allows a retry", async () => {
  mocks.get
    .mockResolvedValueOnce(ok({ items: [item], nextCursor: "opaque" }))
    .mockRejectedValueOnce(new Error("Offline"));
  const { wrapper } = setup();
  const { result } = renderHook(useSwapHistory, { wrapper });
  await waitFor(() => expect(result.current.items).toHaveLength(1));
  await act(() => result.current.fetchNextPage());
  expect(result.current.items).toEqual([item]);
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.hasNextPage).toBe(true);
  mocks.get.mockResolvedValueOnce(ok({ items: [], nextCursor: null }));
  await act(() => result.current.fetchNextPage());
  await waitFor(() => expect(result.current.hasNextPage).toBe(false));
  expect(result.current.isError).toBe(false);
});

it("isolates viewer caches and invalidates only the current viewer on reconnect", async () => {
  mocks.get.mockResolvedValue(ok({ items: [item], nextCursor: null }));
  const context = setup();
  const invalidate = vi.spyOn(context.qc, "invalidateQueries");
  const { result, rerender } = renderHook(useSwapHistory, { wrapper: context.wrapper });
  await waitFor(() => expect(result.current.items).toHaveLength(1));
  act(() => mocks.reconnect.mock.lastCall![0]());
  expect(invalidate).toHaveBeenLastCalledWith({ queryKey: swapHistoryKey(auth) });
  mocks.get.mockImplementation(() => new Promise(() => {}));
  context.setAuth({ ...auth, walletAddress: "viewer-b" });
  rerender();
  expect(result.current.items).toEqual([]);
  expect(mocks.off).toHaveBeenCalled();
  context.setAuth(demoAuth);
  rerender();
  expect(result.current.items).toEqual([]);
});

it.each(["empty", "loading", "error", "signed-out"])("renders the %s history state", async (state) => {
  mocks.get.mockImplementation(() =>
    state === "loading"
      ? new Promise(() => {})
      : state === "error"
        ? Promise.reject(new Error("Offline"))
        : Promise.resolve(ok({ items: [], nextCursor: null })),
  );
  const { wrapper } = setup(state === "signed-out" ? demoAuth : auth);
  render(createElement(SwapHistoryPanel, { mint: "token" }), { wrapper });
  if (state === "loading") {
    expect(screen.getByRole("status", { name: "Loading your swaps" })).toBeDefined();
    return;
  }
  const message =
    state === "empty"
      ? "No swaps yet."
      : state === "error"
        ? /Swap history unavailable/
        : "Sign in to view your swap history.";
  await waitFor(() => expect(screen.getByText(message)).toBeDefined());
});

it("renders exact amounts, failure errors and explorer links; loads more rows", async () => {
  mocks.get.mockImplementation(async (path, options) => {
    if (path !== "/v1/swaps") return ok({ mint: "token", symbol: "SOL", decimals: 9 });
    return ok({
      items: options.params.query.cursor
        ? [
            {
              ...item,
              requestId: "failed",
              status: "failed",
              error: "Slippage exceeded",
              signature: undefined,
            },
          ]
        : [item],
      nextCursor: options.params.query.cursor ? null : "older",
    });
  });
  const { wrapper } = setup();
  render(createElement(SwapHistoryPanel, { mint: "token" }), { wrapper });
  await waitFor(() => expect(screen.getByText("1.234567891 SOL")).toBeDefined());
  expect(screen.getByText("1 USDC")).toBeDefined();
  expect(screen.getByRole("link", { name: "Solscan ↗" }).getAttribute("href")).toContain("/tx/sig");
  fireEvent.click(screen.getByRole("button", { name: "Load more swaps" }));
  await waitFor(() => expect(screen.getByText("Slippage exceeded")).toBeDefined());
  expect(screen.queryByRole("button", { name: "Load more swaps" })).toBeNull();
});
