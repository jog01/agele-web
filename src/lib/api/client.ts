import createClient from "openapi-fetch";
import { env } from "@/env";
import type { components, paths } from "./schema";

export const api = createClient<paths>({ baseUrl: env.NEXT_PUBLIC_API_URL });

export type Token = components["schemas"]["Token"];
export type Candle = components["schemas"]["Candle"];
export type Trade = components["schemas"]["Trade"];
export type LeaderboardEntry = components["schemas"]["LeaderboardEntry"];
export type Comment = components["schemas"]["Comment"];
export type Interval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
export type LeaderboardWindow = "24h" | "7d" | "30d";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Unwraps an openapi-fetch result, throwing on non-2xx so React Query sees an error. */
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.data !== undefined) return result.data;
  const message =
    (result.error as { error?: { message?: string } } | undefined)?.error?.message ?? "Request failed";
  throw new ApiError(message, result.response.status);
}
