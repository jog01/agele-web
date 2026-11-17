import { describe, expect, it, vi } from "vitest";
import { fromBaseUnits, toBaseUnits } from "./amounts";
import { ApiError } from "./api/client";
import type { SwapIssued, SwapStatus, SwapSubmission } from "./api/schema";
import { executeSwap, swapErrorMessage } from "./swaps";

const input = { inputMint: "usdc", outputMint: "token", amount: "1000000", slippageBps: 50 };
const order: SwapIssued = {
  ...input,
  inAmount: input.amount,
  outAmount: "2000",
  otherAmountThreshold: "1900",
  priceImpactPct: "0.1",
  feeBps: 20,
  router: "jupiter",
  requestId: "one",
  transaction: "unsigned",
  expiresAt: "2030-01-01T00:00:00Z",
};
function dependencies() {
  return {
    create: vi.fn(async () => order),
    sign: vi.fn(async () => "signed"),
    submit: vi.fn(async (): Promise<SwapSubmission> => ({ signature: "sig", status: "confirmed" })),
    status: vi.fn(
      async (): Promise<SwapStatus> => ({ requestId: "one", status: "confirmed", signature: "sig" }),
    ),
    now: () => Date.parse("2029-01-01T00:00:00Z"),
    wait: vi.fn(async () => {}),
    phase: vi.fn(),
  };
}

describe("amounts", () => {
  it("converts without numeric precision loss", () => {
    expect(toBaseUnits("9007199254740993.123456", 6)).toBe("9007199254740993123456");
    expect(fromBaseUnits("9007199254740993123456", 6)).toBe("9007199254740993.123456");
    expect(toBaseUnits("000.000001", 6)).toBe("1");
    expect(fromBaseUnits("1", 6)).toBe("0.000001");
    expect(toBaseUnits("0", 0)).toBe("0");
    expect(fromBaseUnits("0", 6)).toBe("0");
    expect(fromBaseUnits("123", 0)).toBe("123");
  });
  it.each(["", "-1", "1e6", "NaN", "0.0000001"])("rejects invalid amount %s", (value) => {
    expect(() => toBaseUnits(value, 6)).toThrow();
  });
  it("rejects invalid decimals and base units", () => {
    expect(() => toBaseUnits("1", -1)).toThrow();
    expect(() => fromBaseUnits("1.2", 6)).toThrow();
  });
});

describe("swap errors", () => {
  it.each([
    [503, "trading_disabled", "Demo only"],
    [422, "swap_rejected", "Swap rejected"],
    [422, "sponsor_rejected", "Sponsorship rejected"],
    [409, "no_linked_wallet", "No linked wallet"],
    [500, "unknown", "Server message"],
  ])("maps %s %s", (status, code, expected) => {
    expect(swapErrorMessage(new ApiError("Server message", status, code))).toContain(expected);
  });
  it("handles absent errors", () => expect(swapErrorMessage(null)).toContain("Swap failed"));
});

describe("swap orchestration", () => {
  it("creates, signs and submits without polling on direct confirmation", async () => {
    const deps = dependencies();
    expect(await executeSwap(input, deps)).toMatchObject({ status: "confirmed", signature: "sig" });
    expect(deps.create).toHaveBeenCalledWith(input);
    expect(deps.sign).toHaveBeenCalledWith("unsigned");
    expect(deps.submit).toHaveBeenCalledWith("one", "signed");
    expect(deps.status).not.toHaveBeenCalled();
    expect(deps.phase.mock.calls.flat()).toEqual(["creating", "signing", "submitting", "confirmed"]);
  });
  it("polls submitted to confirmed", async () => {
    const deps = dependencies();
    deps.submit.mockResolvedValue({ status: "submitted", signature: "sig" });
    expect(await executeSwap(input, deps)).toMatchObject({ status: "confirmed" });
    expect(deps.wait).toHaveBeenCalledWith(1500);
    expect(deps.status).toHaveBeenCalledTimes(1);
  });
  it("fails without polling a failed submission", async () => {
    const deps = dependencies();
    deps.submit.mockResolvedValue({ status: "failed", signature: "sig", error: "Slippage exceeded" });
    await expect(executeSwap(input, deps)).rejects.toThrow("Slippage exceeded");
    expect(deps.status).not.toHaveBeenCalled();
  });
  it("does not sign when trading is disabled", async () => {
    const deps = dependencies();
    deps.create.mockRejectedValue(new ApiError("Disabled", 503, "trading_disabled"));
    await expect(executeSwap(input, deps)).rejects.toMatchObject({ code: "trading_disabled" });
    expect(deps.sign).not.toHaveBeenCalled();
  });
  it("recreates an expired order and signs only the fresh transaction", async () => {
    const deps = dependencies();
    deps.create
      .mockResolvedValueOnce({ ...order, expiresAt: "2020-01-01" })
      .mockResolvedValueOnce({ ...order, requestId: "two", transaction: "fresh" });
    await executeSwap(input, deps);
    expect(deps.create).toHaveBeenCalledTimes(2);
    expect(deps.sign).toHaveBeenCalledExactlyOnceWith("fresh");
    expect(deps.submit).toHaveBeenCalledWith("two", "signed");
  });
  it("stops if replacement is also expired", async () => {
    const deps = dependencies();
    deps.create.mockResolvedValue({ ...order, expiresAt: "2020-01-01" });
    expect(await executeSwap(input, deps)).toMatchObject({ status: "expired" });
    expect(deps.sign).not.toHaveBeenCalled();
  });
  it("bounds polling and preserves the explorer signature", async () => {
    const deps = dependencies();
    deps.submit.mockResolvedValue({ status: "submitted", signature: "sig" });
    deps.status.mockResolvedValue({ requestId: "one", status: "submitted" });
    expect(await executeSwap(input, deps)).toMatchObject({ status: "submitted", signature: "sig" });
    expect(deps.status).toHaveBeenCalledTimes(40);
  });
});
