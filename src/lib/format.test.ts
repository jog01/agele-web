import { describe, expect, it } from "vitest";
import { DASH, formatCompactUsd, formatPct, formatPrice, shortAddress, timeAgo } from "./format";

describe("format", () => {
  it("formats prices across magnitudes", () => {
    expect(formatPrice(182.4)).toBe("$182.40");
    expect(formatPrice(0.94)).toBe("$0.94");
    expect(formatPrice(0.0000231)).toBe("$0.0{4}231");
    expect(formatPrice(0.00001)).toBe("$0.0{4}1");
    expect(formatPrice(0.000099999)).toBe("$0.0{3}1");
    expect(formatPrice(Number.NaN)).toBe(DASH);
  });

  it("signs percentages", () => {
    expect(formatPct(1.234)).toBe("+1.23%");
    expect(formatPct(-0.5)).toBe("-0.50%");
    expect(formatPct(undefined)).toBe(DASH);
  });

  it("compacts usd and shortens addresses", () => {
    expect(formatCompactUsd(1_250_000)).toBe("$1.25M");
    expect(shortAddress("So11111111111111111111111111111111111111112")).toBe("So11…1112");
  });

  it("renders relative time", () => {
    expect(timeAgo(100, 130_000)).toBe("30s");
    expect(timeAgo(0, 7_200_000)).toBe("2h");
  });
});
