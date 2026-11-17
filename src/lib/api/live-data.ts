import { z } from "zod";
import type { Token } from "./client";

export const priceTickSchema = z.object({
  mint: z.string(),
  priceUsd: z.number().nonnegative(),
  marketCapUsd: z.number().nonnegative(),
  time: z.number().nonnegative(),
});

export type PriceTick = z.infer<typeof priceTickSchema>;

export const leaderboardSignalSchema = z.object({
  window: z.enum(["24h", "7d", "30d"]),
  updatedAt: z.number().nonnegative(),
});

export type LeaderboardSignal = z.infer<typeof leaderboardSignalSchema>;

type LiveToken = Token & { priceTime?: number };

export function mergeTokenPrice(token: LiveToken | undefined, tick: PriceTick): LiveToken | undefined {
  if (!token || token.mint !== tick.mint || (token.priceTime ?? -1) > tick.time) return token;
  return { ...token, priceUsd: tick.priceUsd, marketCapUsd: tick.marketCapUsd, priceTime: tick.time };
}

export function mergeTrendingPrice(tokens: LiveToken[] | undefined, tick: PriceTick) {
  if (!tokens) return tokens;
  let changed = false;
  const next = tokens.map((token) => {
    const merged = mergeTokenPrice(token, tick) ?? token;
    if (merged !== token) changed = true;
    return merged;
  });
  return changed ? next : tokens;
}
