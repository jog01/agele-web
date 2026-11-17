import { describe, expect, it, vi } from "vitest";
import { fromBaseUnits, toBaseUnits } from "./amounts";
import { ApiError } from "./api/client";
import {
  executeSwap,
  type SwapIssued,
  type SwapStatus,
  type SwapSubmission,
  swapErrorMessage,
} from "./swaps";

const input = { inputMint: "usdc", outputMint: "token", amount: "1000000", slippageBps: 50 };
const order: SwapIssued = {
  slippageBps: 50,
  inAmount: input.amount,
  outAmount: "2000",
  otherAmountThreshold: "1900",
  priceImpactPct: 0.1,
  feeBps: 20,
  router: "jupiter",
  requestId: "one",
  transaction: "unsigned",
  expiresAt: Date.parse("2030-01-01T00:00:00Z"),
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
    [409, "wallet_not_linked", "No linked wallet"],
    [400, "validation_error", "Server message"],
    [404, "not_found", "Server message"],
    [429, "rate_limited", "Server message"],
    [502, "upstream_error", "Server message"],
    [503, "rate_limit_unavailable", "Server message"],
    [500, "unknown", "Server message"],
  ])("maps %s %s", (status, code, expected) => {
    expect(swapErrorMessage(new ApiError("Server message", status, code))).toContain(expected);
  });
  it("handles absent errors", () => expect(swapErrorMessage(null)).toContain("Swap failed"));
  it("preserves sponsor-storage unavailability without a demo label", () => {
    const message = "Swap rate-limit storage temporarily unavailable";
    expect(swapErrorMessage(new ApiError(message, 503, "rate_limit_unavailable"))).toBe(message);
  });
});

describe("swap orchestration", () => {
  it("returns a worse minimum for review without signing", async () => {
    const deps = dependencies();
    const lower = { ...order, otherAmountThreshold: "1899", outAmount: "1999" };
    deps.create.mockResolvedValue(lower);
    expect(await executeSwap({ input, otherAmountThreshold: "1900" }, deps)).toMatchObject({
      status: "requote",
      order: lower,
    });
    expect(deps.sign).not.toHaveBeenCalled();
    expect(deps.submit).not.toHaveBeenCalled();
    await executeSwap({ input, otherAmountThreshold: "1899", order: lower }, deps);
    expect(deps.create).toHaveBeenCalledTimes(1);
    expect(deps.sign).toHaveBeenCalledExactlyOnceWith(lower.transaction);
  });
  it.each(["1900", "1901", "9007199254740993123456789"])(
    "signs an equal or higher minimum %s",
    async (minimum) => {
      const deps = dependencies();
      deps.create.mockResolvedValue({ ...order, otherAmountThreshold: minimum });
      await executeSwap({ input, otherAmountThreshold: "1900" }, deps);
      expect(deps.sign).toHaveBeenCalledTimes(1);
    },
  );
  it("compares large minimums without floating-point rounding", async () => {
    const deps = dependencies();
    deps.create.mockResolvedValue({ ...order, otherAmountThreshold: "9007199254740993000" });
    expect(await executeSwap({ input, otherAmountThreshold: "9007199254740993001" }, deps)).toMatchObject({
      status: "requote",
    });
    expect(deps.sign).not.toHaveBeenCalled();
  });
  it("rechecks the minimum when a reviewed order expires and is recreated", async () => {
    const deps = dependencies();
    deps.create.mockResolvedValue({ ...order, requestId: "two", otherAmountThreshold: "1800" });
    const result = await executeSwap(
      { input, otherAmountThreshold: "1900", order: { ...order, expiresAt: 0 } },
      deps,
    );
    expect(result).toMatchObject({ status: "requote", order: { requestId: "two" } });
    expect(deps.sign).not.toHaveBeenCalled();
  });
  it.each(["", "invalid", "1.5", "-1"])(
    "rejects invalid reviewed minimum %s before signing",
    async (minimum) => {
      const deps = dependencies();
      await expect(executeSwap({ input, otherAmountThreshold: minimum }, deps)).rejects.toThrow(
        "Invalid swap minimum",
      );
      expect(deps.sign).not.toHaveBeenCalled();
    },
  );
  it("does not sign a different input amount", async () => {
    const deps = dependencies();
    deps.create.mockResolvedValue({ ...order, inAmount: "2" });
    await expect(executeSwap({ input, otherAmountThreshold: "1900" }, deps)).rejects.toThrow(
      "Swap input amount changed",
    );
    expect(deps.sign).not.toHaveBeenCalled();
  });
  it("creates, signs and submits without polling on direct confirmation", async () => {
    const deps = dependencies();
    expect(
      await executeSwap({ input, otherAmountThreshold: order.otherAmountThreshold }, deps),
    ).toMatchObject({ status: "confirmed", signature: "sig" });
    expect(deps.create).toHaveBeenCalledWith(input);
    expect(deps.sign).toHaveBeenCalledWith("unsigned");
    expect(deps.submit).toHaveBeenCalledWith("one", "signed");
    expect(deps.status).not.toHaveBeenCalled();
    expect(deps.phase.mock.calls.flat()).toEqual(["creating", "signing", "submitting", "confirmed"]);
  });
  it("polls submitted to confirmed", async () => {
    const deps = dependencies();
    deps.submit.mockResolvedValue({ status: "submitted", signature: "sig" });
    expect(
      await executeSwap({ input, otherAmountThreshold: order.otherAmountThreshold }, deps),
    ).toMatchObject({ status: "confirmed" });
    expect(deps.wait).toHaveBeenCalledWith(1500);
    expect(deps.status).toHaveBeenCalledTimes(1);
  });
  it("fails without polling a failed submission", async () => {
    const deps = dependencies();
    deps.submit.mockResolvedValue({ status: "failed", signature: "sig", error: "Slippage exceeded" });
    await expect(
      executeSwap({ input, otherAmountThreshold: order.otherAmountThreshold }, deps),
    ).rejects.toThrow("Slippage exceeded");
    expect(deps.status).not.toHaveBeenCalled();
  });
  it("does not sign when trading is disabled", async () => {
    const deps = dependencies();
    deps.create.mockRejectedValue(new ApiError("Disabled", 503, "trading_disabled"));
    await expect(
      executeSwap({ input, otherAmountThreshold: order.otherAmountThreshold }, deps),
    ).rejects.toMatchObject({ code: "trading_disabled" });
    expect(deps.sign).not.toHaveBeenCalled();
  });
  it("recreates an expired order and signs only the fresh transaction", async () => {
    const deps = dependencies();
    deps.create
      .mockResolvedValueOnce({ ...order, expiresAt: Date.parse("2020-01-01") })
      .mockResolvedValueOnce({ ...order, requestId: "two", transaction: "fresh" });
    await executeSwap({ input, otherAmountThreshold: order.otherAmountThreshold }, deps);
    expect(deps.create).toHaveBeenCalledTimes(2);
    expect(deps.sign).toHaveBeenCalledExactlyOnceWith("fresh");
    expect(deps.submit).toHaveBeenCalledWith("two", "signed");
  });
  it("stops if replacement is also expired", async () => {
    const deps = dependencies();
    deps.create.mockResolvedValue({ ...order, expiresAt: Date.parse("2020-01-01") });
    expect(
      await executeSwap({ input, otherAmountThreshold: order.otherAmountThreshold }, deps),
    ).toMatchObject({ status: "expired" });
    expect(deps.sign).not.toHaveBeenCalled();
  });
  it("bounds polling and preserves the explorer signature", async () => {
    const deps = dependencies();
    deps.submit.mockResolvedValue({ status: "submitted", signature: "sig" });
    deps.status.mockResolvedValue({ requestId: "one", status: "submitted" });
    expect(
      await executeSwap({ input, otherAmountThreshold: order.otherAmountThreshold }, deps),
    ).toMatchObject({ status: "submitted", signature: "sig" });
    expect(deps.status).toHaveBeenCalledTimes(40);
  });
  it("polls when execution outcome and signature are initially unknown", async () => {
    const deps = dependencies();
    deps.submit.mockResolvedValue({ status: "submitted" });
    expect(
      await executeSwap({ input, otherAmountThreshold: order.otherAmountThreshold }, deps),
    ).toMatchObject({ status: "confirmed", signature: "sig" });
  });
  it("returns a pending request without inventing a signature", async () => {
    const deps = dependencies();
    deps.submit.mockResolvedValue({ status: "submitted" });
    deps.status.mockResolvedValue({ requestId: "one", status: "submitted" });
    expect(
      await executeSwap({ input, otherAmountThreshold: order.otherAmountThreshold }, deps),
    ).toMatchObject({ status: "submitted", signature: undefined });
  });
  it("preserves execution result amounts and numeric code", async () => {
    const deps = dependencies();
    deps.submit.mockResolvedValue({
      status: "confirmed",
      signature: "sig",
      inputAmountResult: "1000000",
      outputAmountResult: "2001",
      code: 0,
    });
    expect(
      await executeSwap({ input, otherAmountThreshold: order.otherAmountThreshold }, deps),
    ).toMatchObject({
      inputAmountResult: "1000000",
      outputAmountResult: "2001",
      code: 0,
    });
  });
  it("does not submit when the millisecond expiry passes during signing", async () => {
    const deps = dependencies();
    let now = order.expiresAt - 1;
    deps.now = () => now;
    deps.sign.mockImplementation(async () => {
      now = order.expiresAt;
      return "signed";
    });
    expect(
      await executeSwap({ input, otherAmountThreshold: order.otherAmountThreshold }, deps),
    ).toMatchObject({ status: "expired" });
    expect(deps.submit).not.toHaveBeenCalled();
  });
  it("rejects invalid expiry without signing", async () => {
    const deps = dependencies();
    deps.create.mockResolvedValue({ ...order, expiresAt: Number.NaN });
    await expect(
      executeSwap({ input, otherAmountThreshold: order.otherAmountThreshold }, deps),
    ).rejects.toThrow("Invalid swap expiry");
    expect(deps.sign).not.toHaveBeenCalled();
  });
});
