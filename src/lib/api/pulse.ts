import { z } from "zod";
import { env } from "@/env";
import { ApiError } from "./client";

// Temporary handwritten contract until /v1/pulse appears in the generated OpenAPI types.
const mint = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
const timestamp = z.number().int().nonnegative();
const amount = z.number().nonnegative();
const count = z.number().int().nonnegative();

const pulseTokenSchema = z.object({
  mint,
  symbol: z.string(),
  name: z.string(),
  logoUri: z.url({ protocol: /^https?$/ }).nullish(),
  creator: z.string(),
  venue: z.string(),
  launchedAt: timestamp,
  curveProgressBps: z.number().int().min(0).max(10_000).nullable(),
  migratedAt: timestamp.nullish(),
  migratedVenue: z.string().nullish(),
  priceUsd: amount,
  marketCapUsd: amount,
  volume24hUsd: amount,
  liquidityUsd: amount,
  holders: count,
  txCount24h: count,
  buys24h: count,
  sells24h: count,
});

const pulseSnapshotSchema = z.object({
  source: z.enum(["demo", "indexed"]),
  new: z.array(pulseTokenSchema),
  finalStretch: z.array(pulseTokenSchema),
  migrated: z.array(pulseTokenSchema),
});

export const pulseEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("upsert"), token: pulseTokenSchema }),
  z.object({
    type: z.literal("migrated"),
    mint,
    migratedVenue: z.string(),
    migratedAt: timestamp,
  }),
]);

export type PulseToken = z.infer<typeof pulseTokenSchema>;
export type PulseSnapshot = z.infer<typeof pulseSnapshotSchema>;
export type PulseEvent = z.infer<typeof pulseEventSchema>;
export type PulseStage = "new" | "finalStretch" | "migrated";

export const PULSE_LIMIT = 30;
export const PULSE_STAGES = ["new", "finalStretch", "migrated"] as const satisfies readonly PulseStage[];

export async function fetchPulse(signal: AbortSignal) {
  const base = env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  const response = await fetch(`${base}/v1/pulse?limit=${PULSE_LIMIT}`, { signal });
  if (!response.ok) throw new ApiError("Pulse could not be loaded", response.status);
  return pulseSnapshotSchema.parse(await response.json());
}

export function mergePulseEvent(snapshot: PulseSnapshot, event: PulseEvent): PulseSnapshot | null {
  const mint = event.type === "upsert" ? event.token.mint : event.mint;
  const stage = PULSE_STAGES.find((stage) => snapshot[stage].some((token) => token.mint === mint));
  const existing = stage && snapshot[stage].find((token) => token.mint === mint);
  if (event.type === "upsert") {
    if (event.token.migratedAt != null) return moveToMigrated(snapshot, event.token, stage);
    // REST owns lifecycle classification. Re-snapshot if this update might change the bucket or order.
    if (
      !existing ||
      !stage ||
      stage === "migrated" ||
      existing.curveProgressBps !== event.token.curveProgressBps
    )
      return null;
    return {
      ...snapshot,
      [stage]: snapshot[stage].map((token) => (token.mint === mint ? event.token : token)),
    };
  }

  return existing
    ? moveToMigrated(
        snapshot,
        { ...existing, migratedAt: event.migratedAt, migratedVenue: event.migratedVenue },
        stage,
      )
    : null;
}

function moveToMigrated(snapshot: PulseSnapshot, token: PulseToken, previousStage?: PulseStage) {
  const withoutMint = (row: PulseToken) => row.mint !== token.mint;
  return {
    ...snapshot,
    new: previousStage === "new" ? snapshot.new.filter(withoutMint) : snapshot.new,
    finalStretch:
      previousStage === "finalStretch" ? snapshot.finalStretch.filter(withoutMint) : snapshot.finalStretch,
    migrated: [...snapshot.migrated.filter(withoutMint), token]
      .sort((a, b) => (b.migratedAt ?? 0) - (a.migratedAt ?? 0))
      .slice(0, PULSE_LIMIT),
  };
}
