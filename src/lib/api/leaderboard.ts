import type { LeaderboardWindow } from "./client";

export const LEADERBOARD_WINDOWS = ["24h", "7d", "30d"] as const satisfies readonly LeaderboardWindow[];

export function parseLeaderboardWindow(value: string | null): LeaderboardWindow {
  return LEADERBOARD_WINDOWS.find((window) => window === value) ?? "7d";
}

export function leaderboardDataSource(headers: Headers): "demo" | "indexed" | "unknown" {
  const source = headers.get("X-Data-Source");
  return source === "demo" || source === "indexed" ? source : "unknown";
}
