import { describe, expect, it } from "vitest";
import { solanaCluster } from "./solana/cluster";
import { historyItems, historySide, type SwapHistoryItem, swapAmount, swapMarkers } from "./swap-history";

const buy: SwapHistoryItem = {
  requestId: "buy",
  status: "confirmed",
  inputMint: solanaCluster().usdcMint,
  outputMint: "token",
  inAmount: "1000000",
  outAmount: "1234567891",
  createdAt: "2026-01-01T00:00:00.500Z",
};

describe("history amounts", () => {
  it("uses USDC precision and exact metadata precision without float conversion", () => {
    expect(swapAmount("9007199254740993123456", solanaCluster().usdcMint)).toBe(
      "9007199254740993.123456 USDC",
    );
    expect(swapAmount(buy.outAmount, "token", { mint: "token", symbol: "SOL", decimals: 9 })).toBe(
      "1.234567891 SOL",
    );
    expect(swapAmount("0", solanaCluster().usdcMint)).toBe("0 USDC");
  });
  it("shows raw units for unknown, mismatched, invalid metadata or invalid amounts", () => {
    for (const token of [
      undefined,
      { mint: "other", symbol: "OTHER", decimals: 9 },
      { mint: "token", symbol: "SOL", decimals: -1 },
    ])
      expect(swapAmount("1234567891", "token", token)).toContain("1234567891 base units");
    expect(swapAmount("invalid", solanaCluster().usdcMint)).toContain("invalid base units");
  });
});

describe("history markers", () => {
  it("selects confirmed swaps for this mint, sorts ascending, maps buy/sell and deduplicates", () => {
    const sell = {
      ...buy,
      requestId: "sell",
      inputMint: "token",
      outputMint: solanaCluster().usdcMint,
      createdAt: "2026-01-01T01:00:00Z",
    };
    const markers = swapMarkers(
      [
        sell,
        buy,
        buy,
        { ...buy, requestId: "failed", status: "failed" },
        { ...buy, requestId: "other", outputMint: "other" },
      ],
      "token",
    );
    expect(markers).toMatchObject([
      {
        id: "buy",
        time: Date.parse(buy.createdAt) / 1000 - 0.5,
        text: "Buy",
        position: "belowBar",
        shape: "arrowUp",
      },
      { id: "sell", text: "Sell", position: "aboveBar", shape: "arrowDown" },
    ]);
    expect(historySide(sell, "unrelated-token")).toBe("sell");
  });
  it("handles empty, invalid dates, self-swaps and non-confirmed statuses safely", () => {
    expect(swapMarkers([], "token")).toEqual([]);
    expect(
      swapMarkers(
        [
          { ...buy, createdAt: "bad" },
          { ...buy, inputMint: "token" },
          ...(["issued", "submitted", "failed", "expired"] as const).map((status) => ({ ...buy, status })),
        ],
        "token",
      ),
    ).toEqual([]);
  });
  it("flattens pages in newest-first server order and removes overlapping requests", () => {
    expect(
      historyItems([
        { items: [buy], nextCursor: "opaque" },
        { items: [buy, { ...buy, requestId: "older" }], nextCursor: null },
      ]).map((item) => item.requestId),
    ).toEqual(["buy", "older"]);
    expect(historyItems()).toEqual([]);
  });
});
