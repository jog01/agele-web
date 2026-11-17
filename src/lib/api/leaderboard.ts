export function leaderboardDataSource(headers: Headers): "demo" | "indexed" | "unknown" {
  const source = headers.get("X-Data-Source");
  return source === "demo" || source === "indexed" ? source : "unknown";
}
