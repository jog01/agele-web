import { z } from "zod";
import { api, unwrap } from "./client";
import type { components } from "./schema";

export type PulseToken = components["schemas"]["PulseToken"];
export type PulseSnapshot = components["schemas"]["Pulse"];
export type PulseEvent = components["schemas"]["PulseEvent"];
export type PulseStage = PulseToken["stage"];

const mint = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
const timestamp = z.number().int().min(0).max(8_640_000_000_000);
const count = z.number().int().min(0);
const stage = z.enum(["new", "finalStretch", "migrated"]);
const venue = z.enum([
  "pump.fun",
  "pumpswap",
  "raydium-v4",
  "raydium-cpmm",
  "raydium-clmm",
  "meteora-dlmm",
  "meteora-damm",
]);

const pulseTokenSchema = z.object({
  mint,
  symbol: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  creator: z.string(),
  venue,
  stage,
  launchedAt: timestamp,
  curveProgressBps: z.number().int().min(0).max(10_000),
  migratedAt: timestamp.nullable(),
  migratedVenue: venue.nullable(),
  priceUsd: z.number(),
  marketCapUsd: z.number(),
  volume24hUsd: z.number(),
  liquidityUsd: z.number(),
  holders: count,
  txCount24h: count,
  buys24h: count,
  sells24h: count,
}) satisfies z.ZodType<PulseToken>;

export const pulseEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("upsert"), stage, token: pulseTokenSchema }),
  z.object({
    type: z.literal("migrated"),
    mint,
    migratedVenue: venue,
    migratedAt: timestamp,
  }),
]) satisfies z.ZodType<PulseEvent>;

export const PULSE_LIMIT = 30;
export const PULSE_STAGES = stage.options;

export async function fetchPulse(signal: AbortSignal) {
  return unwrap(await api.GET("/v1/pulse", { params: { query: { limit: PULSE_LIMIT } }, signal }));
}

export function mergePulseEvent(snapshot: PulseSnapshot, event: PulseEvent): PulseSnapshot | null {
  const mint = event.type === "upsert" ? event.token.mint : event.mint;
  const existing = PULSE_STAGES.flatMap((stage) => snapshot[stage]).find((token) => token.mint === mint);
  if (event.type === "migrated" && !existing) return null;
  const next =
    event.type === "upsert"
      ? { ...event.token, stage: event.stage }
      : {
          ...existing!,
          stage: "migrated" as const,
          migratedAt: event.migratedAt,
          migratedVenue: event.migratedVenue,
        };
  if (
    existing?.stage === "migrated" &&
    (next.stage !== "migrated" || (next.migratedAt ?? 0) < (existing.migratedAt ?? 0))
  )
    return snapshot;
  if (
    event.type === "migrated" &&
    existing?.migratedAt === event.migratedAt &&
    existing.migratedVenue === event.migratedVenue
  )
    return snapshot;
  const result = { ...snapshot };
  for (const stage of PULSE_STAGES) {
    const rows = snapshot[stage];
    if (stage !== next.stage && !rows.some((token) => token.mint === mint)) continue;
    const withoutMint = rows.filter((token) => token.mint !== mint);
    result[stage] =
      stage === next.stage
        ? [...withoutMint, next].sort((a, b) => compare(a, b, stage)).slice(0, PULSE_LIMIT)
        : withoutMint;
  }
  return result;
}

function rank(token: PulseToken, stage: PulseStage) {
  if (stage === "migrated") return token.migratedAt ?? 0;
  if (stage === "finalStretch") return token.curveProgressBps;
  return token.launchedAt;
}

function compare(a: PulseToken, b: PulseToken, stage: PulseStage) {
  return (
    rank(b, stage) - rank(a, stage) ||
    (stage === "finalStretch" ? b.launchedAt - a.launchedAt : 0) ||
    (a.mint < b.mint ? -1 : a.mint > b.mint ? 1 : 0)
  );
}
