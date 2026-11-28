import { api, unwrap } from "./client";
import type { components } from "./schema";
import { type SocialAuth, socialHeaders } from "./social";

export type NotificationPage = components["schemas"]["NotificationPage"];
export type Notification = components["schemas"]["Notification"];
export type AlertSettings = components["schemas"]["AlertSettings"];
export type NotificationUpdate = components["schemas"]["NotificationUpdate"];

export const notificationsApi = {
  async list(auth: SocialAuth, cursor?: string, signal?: AbortSignal) {
    return unwrap(
      await api.GET("/v1/me/notifications", {
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
      await api.GET("/v1/me/notifications/settings", {
        headers: await socialHeaders(auth),
        signal,
        cache: "no-store",
      }),
    );
  },
  async unreadCount(auth: SocialAuth, signal?: AbortSignal) {
    return unwrap(
      await api.GET("/v1/me/notifications/unread-count", {
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
        ? await api.PUT("/v1/me/notifications/read-all", { headers })
        : await api.PUT("/v1/me/notifications/{id}/read", { headers, params: { path: { id } } }),
    );
  },
  async saveSettings(auth: SocialAuth, body: AlertSettings) {
    return unwrap(
      await api.PUT("/v1/me/notifications/settings", {
        headers: await socialHeaders(auth),
        body,
      }),
    );
  },
};
