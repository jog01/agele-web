// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthState, demoAuth } from "@/components/auth/auth-context";
import type { FeedItem, LeaderboardPage } from "@/lib/api/client";
import { socialQueries } from "@/lib/api/queries";
import { feedItemContent, feedQuery, socialViewer, updateFollowing } from "@/lib/api/social";
import { useFeed } from "./use-feed";
import { useFollow } from "./use-follow";

const { get, put, del } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), del: vi.fn() }));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api: { GET: get, PUT: put, DELETE: del },
}));

const signedIn: AuthState = {
  ...demoAuth,
  configured: true,
  authenticated: true,
  walletAddress: "viewer-wallet",
  getAccessToken: async () => "test-token",
};
const clients: QueryClient[] = [];
function setup(auth = demoAuth) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(qc);
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(AuthContext, { value: auth }, children));
  return { qc, wrapper };
}
function ok(data: unknown) {
  return { data, response: new Response(null, { status: 200 }) };
}
const thesis: Extract<FeedItem, { kind: "thesis" }> = {
  id: "1",
  thesisId: "1",
  positionId: "pos-1",
  pinned: false,
  mint: "mint",
  symbol: "SOL",
  imageUrl: null,
  wallet: "writer",
  handle: "Writer",
  avatarUrl: null,
  source: "demo",
  kind: "thesis",
  body: "My thesis",
  position: "long",
  likes: 3,
  replyCount: 1,
  likedByMe: false,
  createdAt: 100,
};
const trade: Extract<FeedItem, { kind: "trade" }> = {
  id: "2",
  mint: "mint",
  symbol: "SOL",
  imageUrl: null,
  wallet: "writer",
  handle: "Writer",
  avatarUrl: null,
  source: "demo",
  kind: "trade",
  side: "sell",
  amountUsd: 120,
  position: "none",
  createdAt: 99,
};
function board(isFollowing: boolean): LeaderboardPage & { dataSource: "demo" } {
  return {
    dataSource: "demo",
    window: "7d",
    entries: [
      {
        wallet: "writer",
        handle: "Writer",
        rank: 1,
        pnlUsd: 1,
        pnlPct: 1,
        volumeUsd: 1,
        trades: 1,
        winRatePct: 1,
        isFollowing,
      },
    ],
  };
}

afterEach(() => {
  for (const qc of clients) qc.clear();
  clients.length = 0;
  vi.clearAllMocks();
  get.mockReset();
  put.mockReset();
  del.mockReset();
});

describe("feed paging and union handling", () => {
  it.each([
    ["buy", "long", "text-positive"],
    ["buy", "short", "text-positive"],
    ["buy", "none", "text-positive"],
    ["sell", "long", "text-negative"],
    ["sell", "short", "text-negative"],
    ["sell", "none", "text-negative"],
  ] as const)("colors %s trades with position %s by side", (side, position, tone) => {
    expect(feedItemContent({ ...trade, side, position }).tone).toBe(tone);
  });

  it.each([
    ["long", "text-positive"],
    ["short", "text-negative"],
    ["none", "text-primary"],
  ] as const)("keeps thesis position %s mapped to %s", (position, tone) => {
    expect(feedItemContent({ ...thesis, position }).tone).toBe(tone);
  });

  it("passes the opaque cursor unchanged, preserves ordering, and stops on null", async () => {
    const cursor = "opaque:=/++";
    get
      .mockResolvedValueOnce(ok({ items: [thesis], nextCursor: cursor }))
      .mockResolvedValueOnce(ok({ items: [trade], nextCursor: null }));
    const { wrapper } = setup();
    const { result, unmount } = renderHook(() => useFeed("global"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
    expect(result.current.data?.pages.flatMap((page) => page.items)).toEqual([thesis, trade]);
    expect(get.mock.calls.map((call) => call[1].params.query)).toEqual([
      { scope: "global", cursor: undefined, limit: 25 },
      { scope: "global", cursor, limit: 25 },
    ]);
    expect(get.mock.calls[0][1].headers).toBeUndefined();
    expect(feedItemContent(thesis).body).toBe("My thesis");
    expect(feedItemContent(trade)).toMatchObject({ label: "Sell", body: null, attachment: "Sold · $120" });
    expect(feedItemContent({ ...trade, side: "buy" }).label).toBe("Buy");
    unmount();
  });

  it("handles an empty last page and a failed request", async () => {
    get.mockResolvedValueOnce(ok({ items: [], nextCursor: null }));
    const { wrapper, qc } = setup();
    const { result, unmount } = renderHook(() => useFeed("global"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.data?.pages[0].items).toEqual([]);
    get.mockResolvedValue({
      error: { error: { message: "Bad cursor" } },
      response: new Response(null, { status: 400 }),
    });
    await act(async () => {
      await qc.invalidateQueries({ queryKey: ["feed"] });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Bad cursor");
    unmount();
  });

  it("does not request Following while signed out", () => {
    const { wrapper } = setup();
    const { result, unmount } = renderHook(() => useFeed("following"), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(get).not.toHaveBeenCalled();
    unmount();
  });

  it("uses bearer auth and viewer-isolated feed and leaderboard caches", async () => {
    get.mockResolvedValue(ok({ items: [], nextCursor: null }));
    const { qc, wrapper } = setup(signedIn);
    const { result, unmount } = renderHook(() => useFeed("following"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get.mock.calls[0][1].headers).toEqual({ Authorization: "Bearer test-token" });
    expect(feedQuery("following", signedIn).queryKey).not.toEqual(feedQuery("following", demoAuth).queryKey);
    get.mockResolvedValue(ok(board(true)));
    await qc.fetchQuery(socialQueries.leaderboard("7d", signedIn));
    expect(get).toHaveBeenLastCalledWith(
      "/v1/leaderboard",
      expect.objectContaining({ headers: { Authorization: "Bearer test-token" } }),
    );
    expect(socialQueries.leaderboard("7d", signedIn).queryKey).not.toEqual(
      socialQueries.leaderboard("7d").queryKey,
    );
    unmount();
  });
});

describe("follow mutations", () => {
  it("leaves empty caches empty and never mutates a snapshot", () => {
    expect(updateFollowing(undefined, "writer", true)).toBeUndefined();
    const empty = { window: "7d" as const, entries: [] };
    expect(updateFollowing(empty, "writer", true)).toEqual(empty);
    const initial = board(false);
    expect(updateFollowing(initial, "writer", true)?.entries[0].isFollowing).toBe(true);
    expect(initial.entries[0].isFollowing).toBe(false);
  });

  it("rejects a signed-out mutation without optimistic anonymous follow state", async () => {
    const { qc, wrapper } = setup();
    const key = socialQueries.leaderboard("7d").queryKey;
    qc.setQueryData(key, board(false));
    const { result, unmount } = renderHook(useFollow, { wrapper });
    act(() => result.current.mutate({ wallet: "writer", isFollowing: true }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(qc.getQueryData<LeaderboardPage>(key)?.entries[0].isFollowing).toBe(false);
    expect(put).not.toHaveBeenCalled();
    unmount();
  });
  it("optimistically follows across leaderboard windows, accepts 204, and invalidates Following", async () => {
    let finish: (value: unknown) => void = () => {};
    put.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { qc, wrapper } = setup(signedIn);
    const keys = (["24h", "7d"] as const).map(
      (window) => socialQueries.leaderboard(window, signedIn).queryKey,
    );
    for (const key of keys) qc.setQueryData(key, board(false));
    const anonKey = socialQueries.leaderboard("7d").queryKey;
    qc.setQueryData(anonKey, board(false));
    const followingKey = ["feed", socialViewer(signedIn), "following"];
    qc.setQueryData(followingKey, { pages: [], pageParams: [] });
    const { result, unmount } = renderHook(useFollow, { wrapper });
    act(() => result.current.mutate({ wallet: "writer", isFollowing: true }));
    await waitFor(() => expect(qc.getQueryData<LeaderboardPage>(keys[0])?.entries[0].isFollowing).toBe(true));
    expect(qc.getQueryData<LeaderboardPage>(keys[1])?.entries[0].isFollowing).toBe(true);
    expect(qc.getQueryData<LeaderboardPage>(anonKey)?.entries[0].isFollowing).toBe(false);
    await act(async () => {
      finish({ response: new Response(null, { status: 204 }) });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(put).toHaveBeenCalledWith("/v1/follows/{wallet}", {
      params: { path: { wallet: "writer" } },
      headers: { Authorization: "Bearer test-token" },
    });
    expect(qc.getQueryState(followingKey)?.isInvalidated).toBe(true);
    unmount();
  });

  it.each(["http", "network"])("rolls back an optimistic unfollow on %s error", async (failure) => {
    let finish: (value: unknown) => void = () => {};
    let fail: (reason: Error) => void = () => {};
    del.mockReturnValue(
      new Promise((resolve, reject) => {
        finish = resolve;
        fail = reject;
      }),
    );
    const { qc, wrapper } = setup(signedIn);
    const key = socialQueries.leaderboard("7d", signedIn).queryKey;
    qc.setQueryData(key, board(true));
    const { result, unmount } = renderHook(useFollow, { wrapper });
    act(() => result.current.mutate({ wallet: "writer", isFollowing: false }));
    await waitFor(() => expect(qc.getQueryData<LeaderboardPage>(key)?.entries[0].isFollowing).toBe(false));
    await act(async () => {
      if (failure === "network") fail(new Error("offline"));
      else
        finish({
          error: { error: { message: "Cannot follow own wallet" } },
          response: new Response(null, { status: 400 }),
        });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(qc.getQueryData<LeaderboardPage>(key)?.entries[0].isFollowing).toBe(true);
    expect(del).toHaveBeenCalledWith(
      "/v1/follows/{wallet}",
      expect.objectContaining({ headers: { Authorization: "Bearer test-token" } }),
    );
    unmount();
  });

  it("requires a real access token, without sending an anonymous mutation", async () => {
    const { wrapper } = setup({ ...signedIn, getAccessToken: async () => null });
    const { result, unmount } = renderHook(useFollow, { wrapper });
    act(() => result.current.mutate({ wallet: "writer", isFollowing: true }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Sign in again to continue");
    expect(put).not.toHaveBeenCalled();
    unmount();
  });
});
