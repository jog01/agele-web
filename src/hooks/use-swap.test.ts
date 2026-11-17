// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Token } from "@/lib/api/client";
import { useSwap } from "./use-swap";

const query = vi.hoisted(() => vi.fn());
vi.mock("@tanstack/react-query", () => ({ useQuery: query }));
vi.mock("@/components/auth/auth-context", () => ({ useAuth: () => ({ authenticated: false }) }));

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
afterEach(cleanup);

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
