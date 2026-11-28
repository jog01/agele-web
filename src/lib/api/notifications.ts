import { z } from "zod";
import { env } from "@/env";
import { ApiError, unwrap } from "./client";

const notification = z.object({
  id: z.string().min(1),
  kind: z.enum(["trader_trade", "thesis_like", "thesis_comment", "follow", "leaderboard"]),
  createdAt: z.number().int().nonnegative(),
  readAt: z.number().int().nonnegative().nullable(),
  actors: z.array(
    z.object({
      wallet: z.string(),
      handle: z.string().nullish(),
      displayName: z.string().nullish(),
      avatarUrl: z.string().nullish(),
    }),
  ),
  actorCount: z.number().int().nonnegative(),
  target: z.object({
    wallet: z.string().nullish(),
    mint: z.string().nullish(),
    symbol: z.string().nullish(),
    imageUrl: z.string().nullish(),
    positionId: z.string().nullish(),
    thesisId: z.string().nullish(),
    commentId: z.string().nullish(),
    sizeUsd: z.number().nullish(),
    side: z.enum(["buy", "sell"]).nullish(),
  }),
});

const page = z.object({
  source: z.enum(["demo", "indexed"]),
  items: z.array(notification),
  nextCursor: z.string().nullable(),
});

const unread = z.object({ unreadCount: z.number().int().nonnegative() });

export type Notification = z.infer<typeof notification>;

type Access = { getAccessToken: () => Promise<string | null> } | null;

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  access: Access,
  method: "GET" | "PUT",
  signal?: AbortSignal,
) {
  const token = await access?.getAccessToken();
  if (access && !token) throw new ApiError("Sign in again to continue", 401);
  const response = await fetch(`${env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/v1/me/notifications${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    signal,
    cache: "no-store",
  });
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) return unwrap<T>({ error: body, response });
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiError("Unexpected notification response", response.status);
  return parsed.data;
}

export const notificationsApi = {
  list(access: Access, cursor?: string, signal?: AbortSignal) {
    const params = new URLSearchParams({ limit: "25" });
    if (cursor) params.set("cursor", cursor);
    return request(`?${params}`, page, access, "GET", signal);
  },
  unreadCount(access: Access, signal?: AbortSignal) {
    return request("/unread-count", unread, access, "GET", signal);
  },
  markRead(access: Access, id: string | null) {
    return request(id === null ? "/read-all" : `/${encodeURIComponent(id)}/read`, unread, access, "PUT");
  },
};
