// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { AuthContext, demoAuth } from "@/components/auth/auth-context";
import type { Notification } from "@/lib/api/notifications";
import { NotificationCenter, notificationGroups, notificationHref } from "./notification-center";

const { list, viewer, settings, saveSettings } = vi.hoisted(() => ({
  list: vi.fn(),
  viewer: vi.fn(),
  settings: vi.fn(),
  saveSettings: vi.fn(),
}));
vi.mock("@/lib/api/notifications", () => ({ notificationsApi: { list, viewer, settings, saveSettings } }));
vi.mock("@/components/social/thesis-thread-sheet", () => ({
  ThesisThreadBody: ({ thread, focusPostId }: { thread: { thesisId: string }; focusPostId: string }) =>
    createElement("p", null, `${thread.thesisId}/${focusPostId}`),
}));

const follow: Notification = {
  id: "first",
  createdAt: 1_700_000_000,
  count: 4,
  actors: [{ wallet: "follower", handle: "mira", displayName: null, avatarUrl: null }],
  details: { kind: "follow" },
  token: null,
};
const liked: Notification = {
  ...follow,
  id: "second",
  count: 1,
  details: { kind: "thesis_like", thesisId: "thesis", postId: "version" },
  token: { mint: "mint", symbol: "SOL", imageUrl: "https://example.com/token.png" },
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

it("preserves the exact demo fill and indexed signature, and links the stated leaderboard window", () => {
  const trade: Notification = {
    ...liked,
    details: { kind: "trader_activity", side: "sell", tradeId: "fill", signature: "tx" },
  };
  expect(notificationHref(trade, "demo")).toBe("/feed?trader=follower&mint=mint&fill=fill");
  expect(notificationHref(trade, "indexed")).toBe("https://solscan.io/tx/tx");
  expect(notificationHref(follow, "indexed")).toBe("/traders/follower");
  expect(
    notificationHref(
      { ...follow, details: { kind: "leaderboard", window: "7d", rank: 3, previousRank: null } },
      "demo",
    ),
  ).toBe("/leaderboard?window=7d");
});

it("loads API pages on demand and opens the liked version, not the actor’s thesis", async () => {
  list
    .mockResolvedValueOnce({ source: "demo", items: [follow], nextCursor: "a+b" })
    .mockResolvedValueOnce({ source: "demo", items: [liked], nextCursor: null });
  setup();
  expect(list).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
  await screen.findByRole("link", { name: /mira \+ 3/ });
  fireEvent.click(screen.getByRole("button", { name: "Load more" }));
  fireEvent.click(await screen.findByRole("button", { name: /Liked your SOL thesis/ }));
  expect(await screen.findByText("thesis/version")).toBeTruthy();
  expect(list).toHaveBeenLastCalledWith(demoAuth, "a+b", expect.any(AbortSignal));
  fireEvent.click(screen.getByRole("button", { name: "Back to notifications" }));
  expect(screen.getByRole("button", { name: /Liked your SOL thesis/ })).toBeTruthy();
});

it("offers a retry on delivery failure and shows a distinct empty state after recovery", async () => {
  list
    .mockRejectedValueOnce(new Error("Unavailable"))
    .mockResolvedValueOnce({ source: "demo", items: [], nextCursor: null });
  setup();
  fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
  expect(screen.getByRole("status", { name: "Loading notifications" })).toBeTruthy();
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await screen.findByText("No notifications yet");
});

it("does not request private notifications for guests on a configured app", async () => {
  const login = vi.fn();
  setup({ ...demoAuth, configured: true, login });
  fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() => expect(login).toHaveBeenCalledOnce());
  expect(list).not.toHaveBeenCalled();
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
  viewer.mockResolvedValue({ id: "viewer-id" });
  settings.mockResolvedValue(initial);
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
  setup(auth);
  fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
  await screen.findByRole("link", { name: /mira/ });
  await waitFor(() => expect(sockets).toHaveLength(1));
  const ws = sockets[0]!;
  ws.onopen?.();
  await waitFor(() =>
    expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ op: "authenticate", token: "test-token" })),
  );
  ws.frame({ type: "authenticated" });
  const topic = "user:viewer-id:alerts";
  expect(ws.send).toHaveBeenLastCalledWith(JSON.stringify({ op: "subscribe", topic }));
  ws.frame({ type: "subscribed", topic });
  await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  ws.frame({ type: "event", topic, data: { kind: "inbox", sound: false } });
  await waitFor(() => expect(list).toHaveBeenCalledTimes(3));

  fireEvent.click(screen.getByRole("button", { name: "Notification settings" }));
  const activity = await screen.findByRole<HTMLInputElement>("checkbox", { name: "Following activity" });
  expect(activity.checked).toBe(true);
  fireEvent.click(activity);
  await waitFor(() => expect(activity.checked).toBe(false));
  expect(saveSettings).toHaveBeenCalledWith(auth, updated);
});
