import createClient from "openapi-fetch";
import { env } from "@/env";
import { api, unwrap } from "./client";
import { type SocialAuth, socialHeaders } from "./social";

type NotificationBase = {
  id: string;
  createdAt: number;
  readAt: number | null;
  actors: {
    wallet: string | null;
    handle: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  }[];
  actorCount: number;
};
type Token = { mint: string; symbol: string; imageUrl: string | null };
type ThesisTarget = Token & { wallet: string; positionId: string; thesisId: string; commentId: string };

export type Notification = NotificationBase &
  (
    | { kind: "thesis_like"; target: ThesisTarget }
    | { kind: "thesis_comment"; target: ThesisTarget }
    | { kind: "follow"; target: { wallet: string | null } }
    | {
        kind: "leaderboard";
        target: { window: "24h" | "7d" | "30d"; rank: number; previousRank: number | null };
      }
    | {
        kind: "trader_trade";
        target: Token & { wallet: string; positionId: string | null; sizeUsd: number; side: "buy" | "sell" };
      }
  );

export type NotificationPage = {
  items: Notification[];
  nextCursor: string | null;
  source: "indexed" | "demo";
};

export type AlertSettings = { traderActivity: boolean; sound: boolean };
export type NotificationUpdate = { kind: "inbox"; sound: boolean } | { kind: "settings" };

type Json<T> = { content: { "application/json": T } };
type Responses<T> = { responses: { 200: Json<T> } };
type UnreadCount = { unreadCount: number };
type NotificationPaths = {
  "/v1/me/notifications": {
    get: Responses<NotificationPage> & { parameters: { query?: { cursor?: string; limit?: number } } };
  };
  "/v1/me/notifications/settings": {
    get: Responses<AlertSettings>;
    put: Responses<AlertSettings> & { requestBody: Json<AlertSettings> };
  };
  "/v1/me/notifications/unread-count": { get: Responses<UnreadCount> };
  "/v1/me/notifications/read-all": { put: Responses<UnreadCount> };
  "/v1/me/notifications/{id}/read": {
    put: Responses<UnreadCount> & { parameters: { path: { id: string } } };
  };
};

const client = createClient<NotificationPaths>({ baseUrl: env.NEXT_PUBLIC_API_URL });

export const notificationsApi = {
  async list(auth: SocialAuth, cursor?: string, signal?: AbortSignal) {
    return unwrap(
      await client.GET("/v1/me/notifications", {
        params: { query: { limit: 25, cursor } },
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
      await client.GET("/v1/me/notifications/settings", {
        headers: await socialHeaders(auth),
        signal,
        cache: "no-store",
      }),
    );
  },
  async unreadCount(auth: SocialAuth, signal?: AbortSignal) {
    return unwrap(
      await client.GET("/v1/me/notifications/unread-count", {
        headers: await socialHeaders(auth),
        signal,
        cache: "no-store",
      }),
    );
  },
  async markRead(auth: SocialAuth, id: string | null) {
    const headers = await socialHeaders(auth);
    return unwrap(
      id === null
        ? await client.PUT("/v1/me/notifications/read-all", { headers })
        : await client.PUT("/v1/me/notifications/{id}/read", { headers, params: { path: { id } } }),
    );
  },
  async saveSettings(auth: SocialAuth, body: AlertSettings) {
    return unwrap(
      await client.PUT("/v1/me/notifications/settings", {
        headers: await socialHeaders(auth),
        body,
      }),
    );
  },
};
