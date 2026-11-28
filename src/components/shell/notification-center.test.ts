// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { AuthContext, demoAuth } from "@/components/auth/auth-context";
import type { Notification } from "@/lib/api/notifications";
import { NotificationCenter, notificationGroups, notificationHref } from "./notification-center";

const { list, viewer, settings, saveSettings, unreadCount, markRead } = vi.hoisted(() => ({
  list: vi.fn(),
  viewer: vi.fn(),
  settings: vi.fn(),
  saveSettings: vi.fn(),
  unreadCount: vi.fn(),
  markRead: vi.fn(),
}));
vi.mock("@/lib/api/notifications", () => ({
  notificationsApi: { list, viewer, settings, saveSettings, unreadCount, markRead },
}));
vi.mock("@/components/social/thesis-thread-sheet", () => ({
  ThesisThreadBody: ({ thread, focusPostId }: { thread: { thesisId: string }; focusPostId: string }) =>
    createElement("p", null, `${thread.thesisId}/${focusPostId}`),
}));

const follow = {
  id: "first",
  createdAt: 1_700_000_000,
  readAt: null,
  actorCount: 4,
  actors: [{ wallet: "follower", handle: "mira", displayName: null, avatarUrl: null }],
  kind: "follow",
  target: { wallet: "profile" },
} satisfies Notification;
const liked: Notification = {
  ...follow,
  id: "second",
  actorCount: 1,
  kind: "thesis_like",
  target: {
    mint: "mint",
    symbol: "SOL",
    imageUrl: "https://example.com/token.png",
    wallet: "owner",
    positionId: "position",
    thesisId: "thesis",
    commentId: "version",
  },
} satisfies Notification;
const signedIn = { ...demoAuth, configured: true, authenticated: true, userLabel: "viewer" };
const trade = {
  ...liked,
  kind: "trader_trade",
  target: {
    wallet: "trader",
    positionId: "position",
    mint: "mint",
    symbol: "SOL",
    imageUrl: null,
    side: "sell",
    sizeUsd: 42,
  },
} satisfies Notification;
const clients: QueryClient[] = [];

function setup(auth = demoAuth, me: object = { walletAddress: null, wallets: [] }, unread = 0) {
  viewer.mockResolvedValue(me);
  unreadCount.mockResolvedValue({ unreadCount: unread });
  settings.mockResolvedValue({ traderActivity: true, sound: false });
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
  vi.resetAllMocks();
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

it("uses the supplied position, profile and leaderboard destinations", () => {
  expect(notificationHref(trade)).toBe("/feed?trader=trader&mint=mint&position=position");
  expect(notificationHref({ ...trade, target: { ...trade.target, positionId: null } })).toBeNull();
  expect(notificationHref(follow)).toBe("/traders/profile");
  expect(
    notificationHref({
      ...follow,
      kind: "leaderboard",
      target: { window: "7d", rank: 3, previousRank: null },
    }),
  ).toBe("/leaderboard?window=7d");
});

it("loads API pages on demand and opens the liked version, not the actor’s thesis", async () => {
  list
    .mockResolvedValueOnce({ source: "demo", items: [follow], nextCursor: "a+b" })
    .mockResolvedValue({ source: "demo", items: [liked], nextCursor: null });
  setup(signedIn);
  markRead.mockResolvedValue({ unreadCount: 0 });
  expect(list).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
  await screen.findByRole("link", { name: /mira \+ 3/ });
  fireEvent.click(screen.getByRole("button", { name: "Load more" }));
  fireEvent.click(await screen.findByRole("button", { name: /Liked your SOL thesis/ }));
  expect(await screen.findByText("thesis/version")).toBeTruthy();
  expect(list).toHaveBeenCalledWith(signedIn, "a+b", expect.any(AbortSignal));
  expect(markRead).toHaveBeenCalledWith(signedIn, "second");
  fireEvent.click(screen.getByRole("button", { name: "Back to notifications" }));
  expect(screen.getByRole("button", { name: /Liked your SOL thesis/ })).toBeTruthy();
});

it("offers a retry on delivery failure and shows a distinct empty state after recovery", async () => {
  list
    .mockRejectedValueOnce(new Error("Unavailable"))
    .mockResolvedValueOnce({ source: "demo", items: [], nextCursor: null });
  setup(signedIn);
  fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
  expect(screen.getByRole("status", { name: "Loading notifications" })).toBeTruthy();
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await screen.findByText("No notifications yet");
});

it("shows the server unread count and marks the whole inbox read", async () => {
  list.mockResolvedValue({ source: "demo", items: [follow], nextCursor: null });
  setup(signedIn, undefined, 1);
  fireEvent.click(await screen.findByRole("button", { name: "Notifications, 1 unread" }));
  await screen.findByText("Unread:");
  markRead.mockImplementationOnce(async () => {
    unreadCount.mockResolvedValue({ unreadCount: 0 });
    list.mockResolvedValue({ source: "demo", items: [{ ...follow, readAt: 1 }], nextCursor: null });
    return { unreadCount: 0 };
  });
  fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
  await waitFor(() => expect(markRead).toHaveBeenCalledWith(signedIn, null));
  await screen.findByText("You’re all caught up.");
  expect(screen.queryByText("Unread:")).toBeNull();
});

it("can mark a trade without a replay read without leaving the inbox", async () => {
  const noReplay = { ...trade, target: { ...trade.target, positionId: null } };
  list.mockResolvedValue({ source: "demo", items: [noReplay], nextCursor: null });
  setup(signedIn);
  fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
  markRead.mockImplementationOnce(async () => {
    list.mockResolvedValue({ source: "demo", items: [{ ...noReplay, readAt: 1 }], nextCursor: null });
    return { unreadCount: 0 };
  });
  fireEvent.click(await screen.findByRole("button", { name: /Sold SOL.*Mark as read/ }));
  await waitFor(() => expect(markRead).toHaveBeenCalledWith(signedIn, noReplay.id));
  await screen.findByText("You’re all caught up.");
  expect(screen.queryByRole("button", { name: /Sold SOL/ })).toBeNull();
});

it("does not request private notifications for guests on a configured app", async () => {
  const login = vi.fn(() => {
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  setup({ ...demoAuth, configured: true, login });
  fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() => expect(login).toHaveBeenCalledOnce());
  expect(list).not.toHaveBeenCalled();
});

it("explains the sign-in requirement without requesting a keyless demo inbox", async () => {
  setup();
  fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
  await screen.findByText("Notifications require sign-in, which isn’t configured here.");
  expect(screen.queryByRole("button", { name: "Sign in" })).toBeNull();
  expect(list).not.toHaveBeenCalled();
  expect(unreadCount).not.toHaveBeenCalled();
});

it("authenticates the private socket, refreshes the open inbox, and saves server settings", async () => {
  const sockets: FakeSocket[] = [];
  class FakeSocket {
    static OPEN = 1;
    readyState = FakeSocket.OPEN;
    onopen?: () => void;
    onmessage?: (event: { data: string }) => void;
    send = vi.fn();
    close = vi.fn();
    constructor() {
      sockets.push(this);
    }
    frame(frame: object) {
      this.onmessage?.({ data: JSON.stringify(frame) });
    }
  }
  vi.stubGlobal("WebSocket", FakeSocket);
  const initial = { traderActivity: true, sound: false };
  const updated = { traderActivity: false, sound: false };
  list.mockResolvedValue({ source: "indexed", items: [follow], nextCursor: null });
  saveSettings.mockImplementation(async () => {
    settings.mockResolvedValue(updated);
    return updated;
  });
  const auth = {
    ...demoAuth,
    configured: true,
    authenticated: true,
    walletAddress: "wallet",
    getAccessToken: async () => "test-token",
  };
  setup(auth, {
    walletAddress: null,
    wallets: [
      { chainType: "solana", address: "secondary", isPrimary: false },
      { chainType: "solana", address: "primary", isPrimary: true },
    ],
  });
  settings.mockResolvedValue(initial);
  fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
  await screen.findByRole("link", { name: /mira/ });
  await waitFor(() => expect(sockets).toHaveLength(1));
  const ws = sockets[0]!;
  ws.onopen?.();
  await waitFor(() =>
    expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ op: "authenticate", token: "test-token" })),
  );
  ws.frame({ type: "authenticated" });
  const topic = "user:primary:notifications";
  expect(ws.send).toHaveBeenLastCalledWith(JSON.stringify({ op: "subscribe", topic }));
  ws.frame({ type: "subscribed", topic });
  await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  ws.frame({ type: "event", topic, data: { type: "changed" } });
  await waitFor(() => expect(list).toHaveBeenCalledTimes(3));
  expect(unreadCount).toHaveBeenCalledTimes(3);

  fireEvent.click(screen.getByRole("button", { name: "Notification settings" }));
  const activity = await screen.findByRole<HTMLInputElement>("checkbox", { name: "Following activity" });
  expect(activity.checked).toBe(true);
  fireEvent.click(activity);
  await waitFor(() => expect(activity.checked).toBe(false));
  expect(saveSettings).toHaveBeenCalledWith(auth, updated);
});
