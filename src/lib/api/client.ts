import createClient from "openapi-fetch";
import { env } from "@/env";
import type { components, paths } from "./schema";

export const api = createClient<paths>({ baseUrl: env.NEXT_PUBLIC_API_URL });

type TokenGetter = () => Promise<string | null>;
let getAccessToken: TokenGetter = async () => null;

/** The auth provider registers Privy's token getter; every request then carries the bearer token when signed in. */
export function setAccessTokenGetter(getter: TokenGetter | null) {
  getAccessToken = getter ?? (async () => null);
}

api.use({
  async onRequest({ request }) {
    if (request.headers.has("authorization")) return request;
    const token = await getAccessToken().catch(() => null);
    if (token) request.headers.set("authorization", `Bearer ${token}`);
    return request;
  },
});

export type Token = components["schemas"]["Token"];
export type Candle = components["schemas"]["Candle"];
export type Trade = components["schemas"]["Trade"];
export type LeaderboardEntry = components["schemas"]["LeaderboardEntry"];
export type Comment = components["schemas"]["Comment"];
export type Me = components["schemas"]["Me"];
export type Interval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
export type LeaderboardWindow = "24h" | "7d" | "30d";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

/** Unwraps an openapi-fetch result, throwing on non-2xx so React Query sees an error. */
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.data !== undefined) return result.data;
  const body = (result.error as { error?: { code?: string; message?: string } } | undefined)?.error;
  throw new ApiError(body?.message ?? "Request failed", result.response.status, body?.code);
}
