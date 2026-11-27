// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthState, demoAuth } from "@/components/auth/auth-context";
import { useMarketDataMode, useMarketDataSource } from "./use-market-data-source";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api: { GET: get },
}));

const clients: QueryClient[] = [];

function setup(auth: Partial<AuthState> = {}) {
  const qc = new QueryClient();
  clients.push(qc);
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client: qc },
      createElement(AuthContext, { value: { ...demoAuth, ...auth } }, children),
    );
  return { qc, wrapper };
}

function health(data: unknown) {
  get.mockResolvedValue({ data, response: new Response(null, { status: 200 }) });
}

afterEach(() => {
  for (const qc of clients) qc.clear();
  clients.length = 0;
  get.mockReset();
});

describe("useMarketDataSource", () => {
  it("defaults to mock while health is pending", () => {
    get.mockReturnValue(new Promise(() => {}));
    const { wrapper } = setup();
    const { result, unmount } = renderHook(useMarketDataSource, { wrapper });
    expect(result.current).toBe("mock");
    expect(get).toHaveBeenCalledWith("/health", { signal: expect.any(AbortSignal) });
    unmount();
  });

  it.each(["mock", "live", "indexed"] as const)("reads %s from health", async (source) => {
    health({ marketData: source });
    const { wrapper, qc } = setup();
    const { result, unmount } = renderHook(useMarketDataSource, { wrapper });
    await waitFor(() => expect(qc.getQueryState(["health", "market-data"])?.status).toBe("success"));
    expect(result.current).toBe(source);
    unmount();
  });

  it.each([{}, null, { marketData: "unknown" }, { marketData: true }])(
    "treats invalid health %j as mock",
    async (data) => {
      health(data);
      const { wrapper, qc } = setup();
      const { result, unmount } = renderHook(useMarketDataSource, { wrapper });
      await waitFor(() => expect(qc.getQueryState(["health", "market-data"])?.status).toBe("success"));
      expect(result.current).toBe("mock");
      unmount();
    },
  );

  it.each(["network", "http"])(
    "falls back to mock after a %s failure, even with cached live data",
    async (failure) => {
      health({ marketData: "live" });
      const { wrapper, qc } = setup();
      const { result, unmount } = renderHook(useMarketDataSource, { wrapper });
      await waitFor(() => expect(result.current).toBe("live"));
      if (failure === "network") get.mockRejectedValue(new Error("offline"));
      else
        get.mockResolvedValue({
          error: { error: { message: "Unavailable" } },
          response: new Response(null, { status: 503 }),
        });
      await act(async () => {
        await qc.invalidateQueries({ queryKey: ["health", "market-data"] });
      });
      await waitFor(() => expect(result.current).toBe("mock"));
      expect(get).toHaveBeenCalledTimes(2);
      unmount();
    },
  );
});

describe("demo labels and trading gates", () => {
  it.each([
    {
      source: "mock",
      configured: true,
      ready: true,
      authenticated: true,
      demoMode: true,
      tradingDisabled: true,
    },
    {
      source: "live",
      configured: false,
      ready: true,
      authenticated: false,
      demoMode: true,
      tradingDisabled: true,
    },
    {
      source: "live",
      configured: true,
      ready: true,
      authenticated: false,
      demoMode: false,
      tradingDisabled: true,
    },
    {
      source: "live",
      configured: true,
      ready: false,
      authenticated: true,
      demoMode: false,
      tradingDisabled: true,
    },
    {
      source: "live",
      configured: true,
      ready: true,
      authenticated: true,
      demoMode: false,
      tradingDisabled: false,
    },
    {
      source: "indexed",
      configured: false,
      ready: true,
      authenticated: false,
      demoMode: true,
      tradingDisabled: true,
    },
    {
      source: "indexed",
      configured: true,
      ready: true,
      authenticated: true,
      demoMode: false,
      tradingDisabled: false,
    },
  ])(
    "derives state from $source and auth $configured/$ready/$authenticated",
    async ({ source, configured, ready, authenticated, demoMode, tradingDisabled }) => {
      health({ marketData: source });
      const { wrapper, qc } = setup({ configured, ready, authenticated });
      const { result, unmount } = renderHook(useMarketDataMode, { wrapper });
      await waitFor(() => expect(qc.getQueryState(["health", "market-data"])?.status).toBe("success"));
      await waitFor(() => expect(result.current).toEqual({ source, demoMode, tradingDisabled }));
      unmount();
    },
  );
});
