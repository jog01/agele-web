// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Token } from "@/lib/api/client";
import { useSwap } from "./use-swap";
import { swapApi, type SwapIssued } from "@/lib/swaps";

const query = vi.hoisted(() => vi.fn());
const auth = vi.hoisted(() => ({
  authenticated: false,
  login: vi.fn(),
  signSwap: vi.fn(async () => "signed"),
}));
vi.mock("@tanstack/react-query", () => ({ useQuery: query }));
vi.mock("@/components/auth/auth-context", () => ({ useAuth: () => auth }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

const token: Token = {
  mint: "token",
  symbol: "SOL",
  name: "Solana",
  decimals: 9,
  imageUrl: null,
  priceUsd: 150,
  priceChange24hPct: 0,
  marketCapUsd: 0,
  liquidityUsd: 0,
  volume24hUsd: 0,
  holders: 0,
};
beforeEach(() => {
  auth.authenticated = false;
  auth.signSwap.mockClear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const issued: SwapIssued = {
  inAmount: "1000000000",
  outAmount: "150000000",
  otherAmountThreshold: "149000000",
  priceImpactPct: 0.1,
  slippageBps: 50,
  feeBps: 25,
  router: "mock",
  requestId: "one",
  transaction: "unsigned",
  expiresAt: Date.now() + 60000,
};

it("shows the created order for re-review and signs that same order on the next Confirm", async () => {
  auth.authenticated = true;
  query.mockReturnValue({ data: issued, error: null });
  const lower = { ...issued, otherAmountThreshold: "148000000", outAmount: "149000000" };
  const create = vi.spyOn(swapApi, "create").mockResolvedValue(lower);
  const submit = vi.spyOn(swapApi, "submit").mockResolvedValue({ status: "confirmed" });
  const { result } = renderHook(() => useSwap(token, "sell", "1", 150));
  await act(() => result.current.confirm());
  expect(result.current.minReceive).toBe("148");
  expect(result.current.receive).toBe("149");
  expect(result.current.status).toContain("Price moved: review the new minimum");
  expect(auth.signSwap).not.toHaveBeenCalled();
  await act(() => result.current.confirm());
  expect(create).toHaveBeenCalledTimes(1);
  expect(auth.signSwap).toHaveBeenCalledExactlyOnceWith("unsigned");
  expect(submit).toHaveBeenCalledExactlyOnceWith("one", "signed");
});

it("does not reuse a requoted order after changing amount or mints", async () => {
  auth.authenticated = true;
  query.mockReturnValue({ data: issued, error: null });
  vi.spyOn(swapApi, "create").mockResolvedValue({ ...issued, otherAmountThreshold: "148000000" });
  const { result, rerender } = renderHook(
    ({ side, raw }: { side: "buy" | "sell"; raw: string }) => useSwap(token, side, raw, 150),
    { initialProps: { side: "sell", raw: "1" } },
  );
  await act(() => result.current.confirm());
  expect(result.current.minReceive).toBe("148");
  rerender({ side: "sell", raw: "2" });
  expect(result.current.quote).toBe(issued);
  rerender({ side: "buy", raw: "1" });
  expect(result.current.quote).toBe(issued);
});

it("uses raw server base units for the numeric sell Value", () => {
  query.mockReturnValue({
    data: { outAmount: "1500000000", otherAmountThreshold: "1492500000" },
    error: null,
  });
  const { result } = renderHook(() => useSwap(token, "sell", "10", 150));
  expect(result.current.receive).toBe("1500");
  expect(result.current.valueUsd).toBe(1500);
});

it("computes numeric sell Value while the client estimate loads", () => {
  query.mockReturnValue({ data: undefined, error: null });
  const { result } = renderHook(() => useSwap(token, "sell", "10", 150));
  expect(result.current.valueUsd).toBe(1500);
});

it("does not show an estimated sell Value on quote failure or empty input", () => {
  query.mockReturnValue({ data: undefined, error: new Error("Quote unavailable") });
  const failed = renderHook(() => useSwap(token, "sell", "10", 150));
  expect(failed.result.current.valueUsd).toBeNull();
  query.mockReturnValue({ data: undefined, error: null });
  const empty = renderHook(() => useSwap(token, "sell", "", 150));
  expect(empty.result.current.valueUsd).toBeNull();
});
