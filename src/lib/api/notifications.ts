import createClient from "openapi-fetch";
import { env } from "@/env";
import { api, unwrap } from "./client";
import { type SocialAuth, socialHeaders } from "./social";

type NotificationDetails =
  | { kind: "thesis_like"; thesisId: string; postId: string }
  | { kind: "follow" }
  | { kind: "clan_invite"; clanId: string; clanName: string }
  | { kind: "send"; signature: string; amount: string }
  | { kind: "leaderboard"; window: "24h" | "7d" | "30d"; rank: number; previousRank: number | null }
  | { kind: "trader_activity"; tradeId: string; signature: string; side: "buy" | "sell" };

export type Notification = {
  id: string;
  createdAt: number;
  actors: {
    wallet: string | null;
    handle: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  }[];
  count: number;
  token: { mint: string; symbol: string; imageUrl: string | null } | null;
  details: NotificationDetails;
};

export type NotificationPage = {
  items: Notification[];
  nextCursor: string | null;
  source: "indexed" | "demo";
};

export type AlertSettings = { traderActivity: boolean; sound: boolean };
export type NotificationUpdate = { kind: "inbox"; sound: boolean } | { kind: "settings" };

type Json<T> = { content: { "application/json": T } };
type Responses<T> = { responses: { 200: Json<T> } };
type NotificationPaths = {
  "/v1/notifications": {
    get: Responses<NotificationPage> & { parameters: { query?: { cursor?: string; limit?: number } } };
  };
  "/v1/notifications/settings": {
    get: Responses<AlertSettings>;
    put: Responses<AlertSettings> & { requestBody: Json<AlertSettings> };
  };
};

const client = createClient<NotificationPaths>({ baseUrl: env.NEXT_PUBLIC_API_URL });

export const notificationsApi = {
  async list(auth: SocialAuth, cursor?: string, signal?: AbortSignal) {
    return unwrap(
      await client.GET("/v1/notifications", {
        params: { query: { limit: 30, cursor } },
        headers: await socialHeaders(auth),
        signal,
        cache: "no-store",
      }),
    );
  },
  async viewer(auth: SocialAuth, signal?: AbortSignal) {
    return unwrap(await api.GET("/v1/me", { headers: await socialHeaders(auth), signal }));
  },
  async settings(auth: SocialAuth, signal?: AbortSignal) {
    return unwrap(
      await client.GET("/v1/notifications/settings", {
        headers: await socialHeaders(auth),
        signal,
        cache: "no-store",
      }),
    );
  },
  async saveSettings(auth: SocialAuth, body: AlertSettings) {
    return unwrap(
      await client.PUT("/v1/notifications/settings", {
        headers: await socialHeaders(auth),
        body,
      }),
    );
  },
};
