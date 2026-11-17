import { describe, expect, it } from "vitest";
import { estimate } from "./order-ticket";

describe("display-only trade estimates", () => {
  it("estimates both sides with the fixed preview slippage", () => {
    expect(estimate("buy", 100, 20)).toEqual({ receive: 5, minReceive: 4.975 });
    expect(estimate("sell", 5, 20)).toEqual({ receive: 100, minReceive: 99.5 });
  });
  it("rejects invalid values and overflow", () => {
    for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(estimate("buy", value, 20)).toBeNull();
      expect(estimate("sell", 1, value)).toBeNull();
    }
    expect(estimate("sell", Number.MAX_VALUE, Number.MAX_VALUE)).toBeNull();
  });
});
