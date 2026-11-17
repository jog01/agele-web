import { expect, it } from "vitest";
import { swapReviewValues } from "./swap-display";

it.each([
  [1.23456789, "1.23%"],
  [3, "3.00%"],
  [0.01, "0.01%"],
  [0.00999, "<0.01%"],
  [0.0000001, "<0.01%"],
  [0, "0.00%"],
  [-1.23456, "-1.23%"],
  [-0.0001, ">-0.01%"],
  [Number.NaN, "—"],
  [Number.POSITIVE_INFINITY, "—"],
])("formats price impact %s as %s", (priceImpactPct, expected) => {
  expect(swapReviewValues({ priceImpactPct, feeBps: 2 }).priceImpact).toBe(expected);
});

it("labels provider basis points separately from the unconfigured Agele fee", () => {
  expect(swapReviewValues({ priceImpactPct: 0.1, feeBps: 2 })).toEqual({
    priceImpact: "0.10%",
    routeFee: "0.02%",
    platformFee: "—",
  });
  expect(swapReviewValues({ priceImpactPct: 0, feeBps: 0 }).routeFee).toBe("0.00%");
});

it("shows unavailable values without a quote or with invalid provider fees", () => {
  expect(swapReviewValues()).toEqual({ priceImpact: "—", routeFee: "—", platformFee: "—" });
  expect(swapReviewValues({ priceImpactPct: 0, feeBps: Number.NaN }).routeFee).toBe("—");
});
