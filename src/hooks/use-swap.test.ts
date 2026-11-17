// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ApiError, type Token } from "@/lib/api/client";
import { solanaCluster } from "@/lib/solana/cluster";
import { type SwapIssued, swapApi } from "@/lib/swaps";
import { useSwap } from "./use-swap";

const query = vi.hoisted(() => vi.fn());
const auth = vi.hoisted(() => ({
  configured: true,
  ready: true,
  authenticated: false,
  walletAddress: "wallet-a",
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
  vi.useFakeTimers();
  sessionStorage.clear();
  auth.authenticated = false;
  auth.configured = true;
  auth.ready = true;
  auth.walletAddress = "wallet-a";
  auth.login.mockClear();
  auth.signSwap.mockClear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
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

async function confirm(result: { current: ReturnType<typeof useSwap> }) {
  await act(async () => {
    const execution = result.current.confirm();
    await vi.runAllTimersAsync();
    await execution;
  });
}

const storageKey = `agele:pending-swap:${solanaCluster().caip2}:wallet-a`;

it("restores an unknown swap after unmount and resumes GET without a second create", async () => {
  auth.authenticated = true;
  query.mockReturnValue({ data: issued, error: null });
  const create = vi.spyOn(swapApi, "create").mockResolvedValue(issued);
  const submit = vi.spyOn(swapApi, "submit").mockResolvedValue({ status: "submitted", signature: "sig" });
  const status = vi.spyOn(swapApi, "status").mockRejectedValue(new Error("Offline"));
  const first = renderHook(() => useSwap(token, "sell", "1", 150));
  await confirm(first.result);
  expect(JSON.parse(sessionStorage.getItem(storageKey)!)).toEqual({ requestId: "one", signature: "sig" });
  first.unmount();
  query.mockReturnValue({ data: undefined, error: null });
  const second = renderHook(() => useSwap(token, "buy", "", 150));
  expect(second.result.current.pending).toBe(true);
  expect(second.result.current.explorerUrl).toContain("/tx/sig");
  await act(() => vi.runAllTimersAsync());
  expect(status).toHaveBeenCalledTimes(2);
  expect(status).toHaveBeenLastCalledWith("one");
  expect(create).toHaveBeenCalledTimes(1);
  expect(submit).toHaveBeenCalledTimes(1);
  expect(auth.signSwap).toHaveBeenCalledTimes(1);
  status.mockResolvedValue({ requestId: "one", status: "confirmed", signature: "sig" });
  await confirm(second.result);
  expect(second.result.current.pending).toBe(false);
  expect(sessionStorage.getItem(storageKey)).toBeNull();
  expect(create).toHaveBeenCalledTimes(1);
});

it("restores a storage-only request without a signature and clears it only on a terminal status", async () => {
  auth.authenticated = true;
  sessionStorage.setItem(storageKey, JSON.stringify({ requestId: "from-previous-page" }));
  query.mockReturnValue({ data: issued, error: null });
  const create = vi.spyOn(swapApi, "create");
  const status = vi.spyOn(swapApi, "status").mockRejectedValue(new Error("Offline"));
  const { result } = renderHook(() => useSwap(token, "sell", "1", 150));
  expect(result.current.pending).toBe(true);
  await act(() => vi.runAllTimersAsync());
  expect(sessionStorage.getItem(storageKey)).not.toBeNull();
  status.mockResolvedValue({ requestId: "from-previous-page", status: "expired" });
  await confirm(result);
  expect(sessionStorage.getItem(storageKey)).toBeNull();
  expect(create).not.toHaveBeenCalled();
});

it("does not restore another wallet's pending swap", async () => {
  auth.authenticated = true;
  auth.walletAddress = "wallet-b";
  sessionStorage.setItem(storageKey, JSON.stringify({ requestId: "wallet-a-request" }));
  query.mockReturnValue({ data: issued, error: null });
  const status = vi.spyOn(swapApi, "status");
  const { result } = renderHook(() => useSwap(token, "sell", "1", 150));
  await act(() => vi.runAllTimersAsync());
  expect(result.current.pending).toBe(false);
  expect(status).not.toHaveBeenCalled();
  expect(sessionStorage.getItem(storageKey)).not.toBeNull();
});

it("blocks submit if its pending request cannot be persisted", async () => {
  auth.authenticated = true;
  query.mockReturnValue({ data: issued, error: null });
  vi.spyOn(swapApi, "create").mockResolvedValue(issued);
  const submit = vi.spyOn(swapApi, "submit");
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Storage denied");
  });
  const { result } = renderHook(() => useSwap(token, "sell", "1", 150));
  await confirm(result);
  expect(submit).not.toHaveBeenCalled();
});

it("shares the in-flight submit lock with a remounted ticket", async () => {
  auth.authenticated = true;
  query.mockReturnValue({ data: issued, error: null });
  const create = vi.spyOn(swapApi, "create").mockResolvedValue(issued);
  let finish!: (value: { status: "confirmed"; signature: string }) => void;
  const submit = vi.spyOn(swapApi, "submit").mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const first = renderHook(() => useSwap(token, "sell", "1", 150));
  let execution!: Promise<void>;
  await act(async () => {
    execution = first.result.current.confirm();
  });
  first.unmount();
  const second = renderHook(() => useSwap(token, "sell", "1", 150));
  expect(second.result.current.pending).toBe(true);
  expect(second.result.current.confirmDisabled).toBe(true);
  await act(() => second.result.current.confirm());
  expect(create).toHaveBeenCalledTimes(1);
  expect(submit).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish({ status: "confirmed", signature: "sig" });
    await execution;
  });
  expect(second.result.current.pending).toBe(false);
  expect(sessionStorage.getItem(storageKey)).toBeNull();
});

it("recovers a lost submit response by polling, without another create", async () => {
  auth.authenticated = true;
  query.mockReturnValue({ data: issued, error: null });
  const create = vi.spyOn(swapApi, "create").mockResolvedValue(issued);
  const submit = vi.spyOn(swapApi, "submit").mockRejectedValue(new TypeError("Network down"));
  const status = vi
    .spyOn(swapApi, "status")
    .mockResolvedValue({ requestId: "one", status: "confirmed", signature: "sig" });
  const { result } = renderHook(() => useSwap(token, "sell", "1", 150));
  await confirm(result);
  expect(result.current.status).toBe("Swap confirmed");
  expect(result.current.pending).toBe(false);
  expect(create).toHaveBeenCalledTimes(1);
  expect(submit).toHaveBeenCalledTimes(1);
  expect(status).toHaveBeenCalledExactlyOnceWith("one");
});

it("keeps the request locked after repeated poll failures even if the input and quote disappear", async () => {
  auth.authenticated = true;
  query.mockReturnValue({ data: issued, error: null });
  const create = vi.spyOn(swapApi, "create").mockResolvedValue(issued);
  const submit = vi.spyOn(swapApi, "submit").mockResolvedValue({ status: "submitted", signature: "sig" });
  const status = vi.spyOn(swapApi, "status").mockRejectedValue(new Error("Offline"));
  const { result, rerender } = renderHook(({ raw }) => useSwap(token, "sell", raw, 150), {
    initialProps: { raw: "1" },
  });
  await confirm(result);
  expect(result.current.pending).toBe(true);
  expect(result.current.status).toContain("checking swap one");
  expect(result.current.explorerUrl).toContain("solscan.io/tx/sig");
  query.mockReturnValue({ data: undefined, error: new Error("Quote offline") });
  rerender({ raw: "" });
  expect(result.current.confirmDisabled).toBe(false);
  await confirm(result);
  expect(result.current.pending).toBe(true);
  expect(create).toHaveBeenCalledTimes(1);
  expect(auth.signSwap).toHaveBeenCalledTimes(1);
  expect(submit).toHaveBeenCalledTimes(1);
  status.mockResolvedValue({ requestId: "one", status: "confirmed" });
  await confirm(result);
  expect(result.current.status).toBe("Swap confirmed");
  expect(result.current.pending).toBe(false);
  expect(create).toHaveBeenCalledTimes(1);
});

it.each(["failed", "expired"] as const)(
  "permits a fresh order only after status is definitively %s",
  async (terminal) => {
    auth.authenticated = true;
    query.mockReturnValue({ data: issued, error: null });
    const create = vi.spyOn(swapApi, "create").mockResolvedValue(issued);
    vi.spyOn(swapApi, "submit").mockResolvedValue({ status: "submitted" });
    const status = vi.spyOn(swapApi, "status").mockRejectedValue(new Error("Offline"));
    const { result } = renderHook(() => useSwap(token, "sell", "1", 150));
    await confirm(result);
    expect(result.current.pending).toBe(true);
    status.mockResolvedValue({ requestId: "one", status: terminal });
    await confirm(result);
    expect(result.current.pending).toBe(false);
    expect(create).toHaveBeenCalledTimes(1);
    await confirm(result);
    expect(create).toHaveBeenCalledTimes(2);
  },
);

it("does not lock a definite pre-execution submit rejection", async () => {
  auth.authenticated = true;
  query.mockReturnValue({ data: issued, error: null });
  const create = vi.spyOn(swapApi, "create").mockResolvedValue(issued);
  vi.spyOn(swapApi, "submit").mockRejectedValue(new ApiError("Rejected", 422, "swap_rejected"));
  const { result } = renderHook(() => useSwap(token, "sell", "1", 150));
  await confirm(result);
  expect(result.current.pending).toBe(false);
  expect(result.current.status).toContain("Swap rejected");
  await confirm(result);
  expect(create).toHaveBeenCalledTimes(2);
});

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

it("keeps all entered token decimals in review and in the submitted input", async () => {
  auth.authenticated = true;
  query.mockReturnValue({ data: issued, error: null });
  const create = vi.spyOn(swapApi, "create").mockResolvedValue({ ...issued, inAmount: "1234567891" });
  vi.spyOn(swapApi, "submit").mockResolvedValue({ status: "confirmed" });
  const { result } = renderHook(() => useSwap(token, "sell", "1.234567891", 150));
  expect(result.current.inputAmount).toBe("1.234567891");
  await confirm(result);
  expect(create).toHaveBeenCalledWith(expect.objectContaining({ amount: "1234567891" }));
});

it.each(["", "1.2345678912"])("does not provide a rounded review amount for invalid input %s", (raw) => {
  query.mockReturnValue({ data: undefined, error: null });
  const { result } = renderHook(() => useSwap(token, "sell", raw, 150));
  expect(result.current.inputAmount).toBeUndefined();
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

it.each(["buy", "sell"] as const)("rejects oversized %s amounts before requesting a quote", (side) => {
  query.mockReturnValue({ data: undefined, error: null });
  const { result } = renderHook(() => useSwap(token, side, "9".repeat(80), 150));
  expect(result.current.validAmount).toBe(false);
  expect(result.current.inputAmount).toBeUndefined();
  expect(result.current.validation).toContain("Amount is too large");
  expect(query.mock.lastCall?.[0].enabled).toBe(false);
});

it("accepts the API's 78-digit base-unit boundary but not 79 digits", () => {
  query.mockReturnValue({ data: undefined, error: null });
  const { result, rerender } = renderHook(({ raw }) => useSwap(token, "buy", raw, 150), {
    initialProps: { raw: "9".repeat(72) },
  });
  expect(result.current.validAmount).toBe(true);
  expect(result.current.validation).toBe("");
  rerender({ raw: "9".repeat(73) });
  expect(result.current.validAmount).toBe(false);
});
