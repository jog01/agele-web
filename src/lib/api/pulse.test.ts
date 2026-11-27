import { describe, expect, it } from "vitest";
import { mergePulseEvent, type PulseSnapshot, type PulseToken, pulseEventSchema } from "./pulse";

const token: PulseToken = {
  mint: "So11111111111111111111111111111111111111112",
  symbol: "SOL",
  name: "Solana",
  imageUrl: null,
  stage: "new",
  creator: "creator",
  venue: "pump.fun",
  launchedAt: 100,
  curveProgressBps: 1_000,
  migratedAt: null,
  migratedVenue: null,
  priceUsd: 1,
  marketCapUsd: 10_000,
  volume24hUsd: 120,
  liquidityUsd: 400,
  holders: 12,
  txCount24h: 14,
  buys24h: 10,
  sells24h: 4,
};

const snapshot: PulseSnapshot = { source: "demo", new: [token], finalStretch: [], migrated: [] };

describe("Pulse realtime projection", () => {
  it("updates metrics in place without changing the source or mutating the snapshot", () => {
    const updated = { ...token, holders: 13 };
    expect(mergePulseEvent(snapshot, { type: "upsert", stage: "new", token: updated })).toEqual({
      ...snapshot,
      new: [updated],
    });
    expect(snapshot.new).toEqual([token]);
  });

  it("moves a known token from its current stage to Migrated", () => {
    const event = { type: "migrated", mint: token.mint, migratedAt: 200, migratedVenue: "pumpswap" } as const;
    expect(mergePulseEvent(snapshot, event)).toEqual({
      ...snapshot,
      new: [],
      migrated: [{ ...token, stage: "migrated", migratedAt: 200, migratedVenue: "pumpswap" }],
    });
  });

  it("uses the upsert stage and sorts the destination bucket by backend rank", () => {
    const existing = {
      ...token,
      mint: "7umVG8naBHhYBxVLVVDsz2p9QSZvBF4wNvdysPFwuX1",
      stage: "finalStretch",
      curveProgressBps: 7_900,
    } as const;
    const promoted = { ...token, stage: "finalStretch", curveProgressBps: 8_000 } as const;
    expect(
      mergePulseEvent(
        { ...snapshot, finalStretch: [existing] },
        {
          type: "upsert",
          stage: "finalStretch",
          token: promoted,
        },
      ),
    ).toEqual({ ...snapshot, new: [], finalStretch: [promoted, existing] });
    expect(
      mergePulseEvent(snapshot, { type: "upsert", stage: "finalStretch", token: existing })?.finalStretch,
    ).toEqual([existing]);
  });

  it("does not move a migrated token back to an earlier stage", () => {
    const migrated = mergePulseEvent(snapshot, {
      type: "migrated",
      mint: token.mint,
      migratedAt: 200,
      migratedVenue: "pumpswap",
    })!;
    expect(mergePulseEvent(migrated, { type: "upsert", stage: "new", token })).toBe(migrated);
  });

  it("validates realtime data before it can reach the cache", () => {
    expect(pulseEventSchema.safeParse({ type: "upsert", stage: "new", token }).success).toBe(true);
    expect(
      pulseEventSchema.safeParse({
        type: "upsert",
        stage: "new",
        token: { ...token, curveProgressBps: 10_001 },
      }).success,
    ).toBe(false);
    expect(pulseEventSchema.safeParse({ type: "migrated", mint: token.mint }).success).toBe(false);
  });
});
