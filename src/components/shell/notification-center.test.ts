// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type ComponentProps, createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { AuthContext, demoAuth } from "@/components/auth/auth-context";
import type { Notification } from "@/lib/api/notifications";
import { NotificationCenter, notificationGroups, notificationHref } from "./notification-center";

vi.mock("next/link", () => ({
  default: ({
    onNavigate,
    prefetch: _prefetch,
    ...props
  }: ComponentProps<"a"> & { onNavigate?: () => void; prefetch?: boolean }) =>
    createElement("a", {
      ...props,
      onClick: (event) => {
        event.preventDefault();
        onNavigate?.();
      },
    }),
}));

const follow: Notification = {
  id: "first/read",
  kind: "follow",
  createdAt: 1_700_000_000,
  readAt: null,
  actorCount: 4,
  actors: [{ wallet: "follower", handle: "mira" }],
  target: {},
};

const comment: Notification = {
  ...follow,
  id: "second",
  kind: "thesis_comment",
  actorCount: 1,
  target: { wallet: "author", mint: "mint", positionId: "position", thesisId: "thesis", commentId: "reply" },
};

const clients: QueryClient[] = [];

function setup(auth = demoAuth) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(AuthContext, { value: auth }, createElement(NotificationCenter)),
    ),
  );
}

afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  vi.unstubAllGlobals();
});

it("groups entries by calendar day and week in the viewer’s timezone", () => {
  const dates = [11, 10, 7].map((day) => ({
    ...follow,
    id: String(day),
    createdAt: +new Date(2026, 10, day, 9) / 1000,
  }));
  expect(notificationGroups(dates, +new Date(2026, 10, 11, 12))).toEqual(dates.map((date) => [date]));
});

it("uses exact replay, thesis and comment IDs and does not guess an incomplete destination", () => {
  const href = notificationHref(comment);
  expect(href).toBe("/feed?trader=author&mint=mint&position=position&thesis=thesis&comment=reply");
  expect(notificationHref({ ...comment, target: { ...comment.target, commentId: null } })).toBe(null);
  expect(notificationHref(follow)).toBe("/traders/follower");
  expect(notificationHref({ ...follow, kind: "leaderboard" })).toBe("/leaderboard");
});

it("reads API pages on demand and marks a notification only when its destination is opened", async () => {
  let unreadCount = 2;
  const fetcher = vi.fn(async (input: string, options?: RequestInit) => {
    const url = new URL(input);
    if (url.pathname.endsWith("/unread-count")) return Response.json({ unreadCount });
    if (options?.method === "PUT") return Response.json({ unreadCount: --unreadCount });
    return Response.json(
      url.searchParams.has("cursor")
        ? { source: "demo", items: [comment], nextCursor: null }
        : { source: "demo", items: [follow], nextCursor: "a+b" },
    );
  });
  vi.stubGlobal("fetch", fetcher);
  setup();

  const bell = await screen.findByRole("button", { name: "Notifications, 2 unread" });
  expect(fetcher).toHaveBeenCalledTimes(1);
  fireEvent.click(bell);
  const follower = await screen.findByRole("link", { name: /Unread:.*mira \+ 3/ });
  expect(fetcher.mock.calls.some(([, options]) => options?.method === "PUT")).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Load more" }));
  const reply = await screen.findByRole("link", { name: /Commented on your thesis/ });
  expect(reply.getAttribute("href")).toBe(notificationHref(comment));
  expect(fetcher).toHaveBeenCalledWith(expect.stringContaining("cursor=a%2Bb"), expect.anything());
  fireEvent.click(follower);

  await screen.findByRole("button", { name: "Notifications, 1 unread" });
  expect(fetcher).toHaveBeenCalledWith(
    expect.stringContaining("/first%2Fread/read"),
    expect.objectContaining({ method: "PUT" }),
  );
});

it("authenticates account requests and updates both the count and timeline after marking all read", async () => {
  let readAt: number | null = null;
  const fetcher = vi.fn(async (input: string, options?: RequestInit) => {
    if (options?.method === "PUT") readAt = 1_700_000_001;
    if (input.endsWith("/read-all") || input.endsWith("/unread-count")) {
      return Response.json({ unreadCount: readAt ? 0 : 1 });
    }
    return Response.json({ source: "indexed", items: [{ ...follow, readAt }], nextCursor: null });
  });
  vi.stubGlobal("fetch", fetcher);
  setup({
    ...demoAuth,
    authenticated: true,
    configured: true,
    walletAddress: "viewer",
    getAccessToken: async () => "token",
  });
  fireEvent.click(await screen.findByRole("button", { name: "Notifications, 1 unread" }));
  await screen.findByRole("link", { name: /Unread:/ });
  fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));

  await screen.findByText("You’re all caught up.");
  expect(screen.queryByRole("link", { name: /Unread:/ })).toBeNull();
  expect(fetcher).toHaveBeenCalledWith(
    expect.stringContaining("/read-all"),
    expect.objectContaining({ method: "PUT", headers: { Authorization: "Bearer token" } }),
  );
});

it("offers a retry on delivery failure and shows a distinct empty state after recovery", async () => {
  let failed = true;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      if (input.endsWith("/unread-count")) return Response.json({ unreadCount: 0 });
      return failed
        ? Response.json({ error: { message: "Unavailable" } }, { status: 503 })
        : Response.json({ source: "demo", items: [], nextCursor: null });
    }),
  );
  setup();
  fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
  expect(screen.getByRole("status", { name: "Loading notifications" })).toBeTruthy();
  await screen.findByRole("alert");
  failed = false;
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await screen.findByText("No notifications yet");
  expect(screen.queryByText("You’re all caught up.")).toBeNull();
});

it("does not request private notifications for guests on a configured app", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const login = vi.fn();
  setup({ ...demoAuth, configured: true, login });
  fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() => expect(login).toHaveBeenCalledOnce());
  expect(fetcher).not.toHaveBeenCalled();
});
