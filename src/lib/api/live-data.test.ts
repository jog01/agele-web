import { describe, expect, it } from "vitest";
import type { Token, Trade } from "./client";
import {
  leaderboardSignalSchema,
  mergeTokenPrice,
  mergeTrendingPrice,
  newestTokenPrice,
  type PriceTick,
  priceTickSchema,
} from "./live-data";

const token: Token = {
  mint: "mint-a",
  symbol: "A",
  name: "Token A",
  decimals: 9,
  imageUrl: null,
  priceUsd: 1,
  priceChange24hPct: 2,
  marketCapUsd: 100,
  liquidityUsd: 50,
  volume24hUsd: 20,
  holders: 10,
};
const tick: PriceTick = { mint: token.mint, priceUsd: 3, marketCapUsd: 300, time: 100 };

describe("newest displayed price", () => {
  const trade: Trade = {
    mint: token.mint,
    signature: "tx",
    trader: "wallet",
    side: "buy",
    time: 99,
    priceUsd: 2,
    tokenAmount: 1,
    amountUsd: 2,
  };

  it("uses a newer price tick after a trade, then a newer trade over that tick", () => {
    expect(newestTokenPrice(token.mint, token, trade)).toBe(2);
    const liveToken = mergeTokenPrice(token, tick);
    expect(newestTokenPrice(token.mint, liveToken, trade)).toBe(3);
    expect(newestTokenPrice(token.mint, liveToken, { ...trade, time: 101, priceUsd: 4 })).toBe(4);
  });

  it("ignores other mints, handles empty data, and favors a tick on equal timestamps", () => {
    expect(newestTokenPrice("other", token, trade)).toBeNull();
    expect(newestTokenPrice(token.mint, undefined, null)).toBeNull();
    expect(newestTokenPrice(token.mint, token, null)).toBe(1);
    expect(newestTokenPrice(token.mint, mergeTokenPrice(token, tick), { ...trade, time: 100 })).toBe(3);
  });
});

describe("live price cache merges", () => {
  it("updates only price fields and records the tick time without mutating snapshots", () => {
    expect(mergeTokenPrice(token, tick)).toEqual({
      ...token,
      priceUsd: 3,
      marketCapUsd: 300,
      priceTime: 100,
    });
    expect(token.priceUsd).toBe(1);
  });

  it("does not create partial data in an empty cache", () => {
    expect(mergeTokenPrice(undefined, tick)).toBeUndefined();
    expect(mergeTrendingPrice(undefined, tick)).toBeUndefined();
    expect(mergeTrendingPrice([], tick)).toEqual([]);
  });

  it("ignores another mint and out-of-order ticks", () => {
    expect(mergeTokenPrice(token, { ...tick, mint: "other" })).toBe(token);
    const live = mergeTokenPrice(token, tick);
    expect(mergeTokenPrice(live, { ...tick, time: 99 })).toBe(live);
    expect(mergeTokenPrice(live, { ...tick, time: 101, priceUsd: 0 })?.priceUsd).toBe(0);
  });

  it("merges only the matching trending entry, preserving other references", () => {
    const other = { ...token, mint: "other" };
    const tokens = [other, token];
    const merged = mergeTrendingPrice(tokens, tick);
    expect(merged?.[0]).toBe(other);
    expect(merged?.[1]).toEqual(mergeTokenPrice(token, tick));
    expect(tokens[1]).toBe(token);
    expect(mergeTrendingPrice([other], tick)).toEqual([other]);
    expect(mergeTrendingPrice(merged, { ...tick, time: 99 })).toBe(merged);
  });
});

describe("WebSocket payload validation", () => {
  it("accepts agreed price and leaderboard contracts", () => {
    expect(priceTickSchema.safeParse(tick).success).toBe(true);
    for (const window of ["24h", "7d", "30d"]) {
      expect(leaderboardSignalSchema.safeParse({ window, updatedAt: 100 }).success).toBe(true);
    }
  });

  it("rejects malformed payloads rather than corrupting the cache", () => {
    for (const data of [
      null,
      {},
      { ...tick, priceUsd: "3" },
      { ...tick, time: -1 },
      { ...tick, priceUsd: NaN },
    ]) {
      expect(priceTickSchema.safeParse(data).success).toBe(false);
    }
    for (const data of [null, {}, { window: "1h", updatedAt: 100 }, { window: "24h" }]) {
      expect(leaderboardSignalSchema.safeParse(data).success).toBe(false);
    }
  });
});
