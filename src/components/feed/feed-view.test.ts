// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { AuthContext, type AuthState, demoAuth } from "@/components/auth/auth-context";
import type { FeedItem } from "@/lib/api/client";
import { FeedView } from "./feed-view";

const { get, post, put, del } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api: { GET: get, POST: post, PUT: put, DELETE: del },
}));

const signedIn: AuthState = {
  ...demoAuth,
  configured: true,
  authenticated: true,
  walletAddress: "viewer-wallet",
  getAccessToken: async () => "test-token",
};

const thesisPost: Extract<FeedItem, { kind: "thesis" }> = {
  id: "first",
  thesisId: "thesis-1",
  positionId: "pos-1",
  pinned: true,
  kind: "thesis",
  viewCount: 0,
  eventType: "thesis",
  wallet: "trader-wallet",
  handle: "Orca",
  avatarUrl: null,
  source: "demo",
  mint: "sol",
  symbol: "SOL",
  imageUrl: "https://example.com/sol.webp",
  position: "long",
  body: "Watching Solana liquidity.",
  marketCapUsd: 80_000_000_000,
  likes: 4,
  likeCount: 4,
  replyCount: 2,
  likedByMe: false,
  viewerLiked: false,
  createdAt: 1700000000,
};

const tradePost: Extract<FeedItem, { kind: "trade" }> = {
  id: "trade-1",
  kind: "trade",
  eventType: "bought",
  wallet: "trader-wallet",
  handle: "Orca",
  avatarUrl: null,
  source: "demo",
  mint: "sol",
  symbol: "SOL",
  imageUrl: "https://example.com/sol.webp",
  position: "long",
  side: "buy",
  amountUsd: 2500,
  tokenAmount: 15,
  positionId: "pos-1",
  realizedPnlUsd: null,
  priceSinceFirstBuyPct: 12.4,
  marketCapUsd: 80_000_000_000,
  likeCount: 0,
  replyCount: 0,
  viewerLiked: false,
  discussionKey: "trade:trade-1",
  createdAt: 1700000100,
};

function ok(data: unknown, headers?: Record<string, string>) {
  return { data, response: new Response(null, { status: 200, headers }) };
}
function feedOk(items: unknown[], nextCursor: string | null = null) {
  return ok({ items, nextCursor });
}
function deferred<T = ReturnType<typeof feedOk>>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const clients: QueryClient[] = [];
function renderFeed(auth: AuthState = demoAuth) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(AuthContext, { value: auth }, createElement(FeedView)),
    ),
  );
  return client;
}

afterEach(() => {
  cleanup();
  for (const client of clients) client.clear();
  clients.length = 0;
  get.mockReset();
  post.mockReset();
  put.mockReset();
  del.mockReset();
});

function routeGet(handlers: {
  feed?: () => unknown;
  leaderboard?: () => unknown;
  trending?: () => unknown;
  thread?: () => unknown;
}) {
  get.mockImplementation((path: string) => {
    if (path === "/v1/feed") return handlers.feed ? handlers.feed() : Promise.resolve(feedOk([]));
    if (path === "/v1/leaderboard")
      return handlers.leaderboard
        ? handlers.leaderboard()
        : Promise.resolve(ok({ window: "7d", entries: [] }, { "X-Data-Source": "demo" }));
    if (path === "/v1/tokens/trending")
      return handlers.trending
        ? handlers.trending()
        : Promise.resolve(ok({ tokens: [{ mint: "sol", symbol: "SOL", name: "Solana", imageUrl: null }] }));
    if (path === "/v1/tokens/{mint}/theses/{thesisId}")
      return handlers.thread
        ? handlers.thread()
        : Promise.resolve(ok({ pinned: null, comments: [], nextCursor: null }));
    return Promise.resolve(ok({}));
  });
}

it("shows named post and trader skeletons independently, then replaces only resolved content", async () => {
  const feedReq = deferred();
  const boardReq = deferred();
  routeGet({ feed: () => feedReq.promise, leaderboard: () => boardReq.promise });
  renderFeed();
  expect(screen.getByRole("heading", { name: "Feed" })).toBeDefined();
  expect(screen.getByRole("status", { name: "Loading feed" })).toBeDefined();
  expect(screen.getByRole("status", { name: "Loading traders to watch" })).toBeDefined();
  await act(async () => feedReq.resolve(feedOk([thesisPost])));
  expect(await screen.findByText(thesisPost.body)).toBeDefined();
  expect(screen.getByText("Position thesis")).toBeDefined();
  expect(screen.queryByText(/no trade attached/)).toBeNull();
  expect(
    screen.getByRole("button", { name: "Replay SOL position" }).querySelector("img")?.getAttribute("src"),
  ).toBe("https://example.com/sol.webp");
  expect(screen.queryByRole("status", { name: "Loading feed" })).toBeNull();
  expect(screen.getByRole("status", { name: "Loading traders to watch" })).toBeDefined();
});

it("links a trade to the thesis on its exact position episode without leaving the feed", async () => {
  routeGet({ feed: async () => feedOk([thesisPost, tradePost]) });
  const original = window.location.href;
  try {
    renderFeed();
    const [, trade] = await screen.findAllByRole("button", { name: "Replay SOL position" });
    fireEvent.click(trade!);
    const params = new URL(window.location.href).searchParams;
    expect(window.location.pathname).toBe(new URL(original).pathname);
    expect(params.get("trader")).toBe(tradePost.wallet);
    expect(params.get("position")).toBe(tradePost.positionId);
    expect(params.get("thesis")).toBe(thesisPost.thesisId);
    expect(params.has("discussion")).toBe(false);
  } finally {
    window.history.replaceState(null, "", original);
  }
});

it("keeps activity without a position linked to the token in the Trades filter", async () => {
  const activity: Extract<FeedItem, { kind: "multi-user" }> = {
    ...tradePost,
    id: "activity-1",
    kind: "multi-user",
    eventType: "multi-user",
    traderCount: 3,
  };
  routeGet({ feed: async () => feedOk([thesisPost, activity]) });
  renderFeed();
  await screen.findByText(thesisPost.body);
  fireEvent.click(screen.getByRole("button", { name: "Trades" }));
  expect(screen.getByText("3 traders bought $2,500.00")).toBeDefined();
  expect(screen.getByRole("link", { name: /SOL/ }).getAttribute("href")).toBe("/trade/sol");
  expect(screen.queryByRole("button", { name: "Replay SOL position" })).toBeNull();
});

it("keeps loaded posts while a cursor page loads and appends the resolved page", async () => {
  const nextReq = deferred();
  let calls = 0;
  routeGet({
    feed: () => {
      calls += 1;
      return calls === 1 ? Promise.resolve(feedOk([thesisPost], "cursor-2")) : nextReq.promise;
    },
  });
  renderFeed();
  await screen.findByText(thesisPost.body);
  fireEvent.click(screen.getByRole("button", { name: "Load more" }));
  expect(await screen.findByRole("status", { name: "Loading feed" })).toBeDefined();
  expect(screen.getByText(thesisPost.body)).toBeDefined();
  expect(screen.getByRole("button", { name: "Loading…" }).hasAttribute("disabled")).toBe(true);
  await act(async () =>
    nextReq.resolve(feedOk([{ ...thesisPost, id: "second", body: "Second market idea." }])),
  );
  expect(await screen.findByText("Second market idea.")).toBeDefined();
  expect(screen.getByText(thesisPost.body)).toBeDefined();
  expect(screen.queryByRole("status", { name: "Loading feed" })).toBeNull();
  const feedCalls = get.mock.calls.filter(([path]) => path === "/v1/feed");
  expect(feedCalls[1][1].params.query.cursor).toBe("cursor-2");
});

it("does not replace visible posts with skeletons during background refresh or refresh failure", async () => {
  const refreshReq = deferred();
  let calls = 0;
  routeGet({
    feed: () => {
      calls += 1;
      return calls === 1 ? Promise.resolve(feedOk([thesisPost])) : refreshReq.promise;
    },
  });
  const client = renderFeed();
  await screen.findByText(thesisPost.body);
  act(() => {
    void client.invalidateQueries({ queryKey: ["feed"] });
  });
  await waitFor(() => expect(get.mock.calls.filter(([path]) => path === "/v1/feed")).toHaveLength(2));
  expect(screen.getByText(thesisPost.body)).toBeDefined();
  expect(screen.queryByRole("status", { name: "Loading feed" })).toBeNull();
  await act(async () => refreshReq.reject(new Error("Network unavailable")));
  expect((await screen.findByRole("alert")).textContent).toContain("Couldn't update the feed.");
  expect(screen.getByText(thesisPost.body)).toBeDefined();
});

it("shows the signed-out Following gate without a perpetual skeleton or protected request", async () => {
  routeGet({ feed: () => Promise.resolve(feedOk([])) });
  renderFeed();
  await screen.findByText("No feed activity yet.");
  fireEvent.click(screen.getByRole("button", { name: "following" }));
  expect(screen.getByText("Sign in to see traders you follow")).toBeDefined();
  expect(screen.getByRole("button", { name: "Sign in" }).hasAttribute("disabled")).toBe(true);
  expect(screen.queryByRole("status", { name: "Loading feed" })).toBeNull();
  expect(get.mock.calls.filter(([path]) => path === "/v1/feed")).toHaveLength(1);
});

it("filters by Trades and Theses and optimistically likes a thesis via the social API", async () => {
  let liked = false;
  routeGet({
    feed: () =>
      Promise.resolve(
        feedOk([
          tradePost,
          { ...thesisPost, likedByMe: liked, likes: liked ? thesisPost.likes + 1 : thesisPost.likes },
        ]),
      ),
  });
  const likeReq = deferred<{ response: Response }>();
  put.mockReturnValue(likeReq.promise);
  renderFeed(signedIn);
  expect(await screen.findByText(thesisPost.body)).toBeDefined();
  expect(screen.getByText(/Bought \$2,500/)).toBeDefined();

  fireEvent.click(screen.getByRole("button", { name: "Trades" }));
  expect(screen.queryByText(thesisPost.body)).toBeNull();
  expect(screen.getByText(/Bought \$2,500/)).toBeDefined();

  fireEvent.click(screen.getByRole("button", { name: "Theses" }));
  expect(screen.getByText(thesisPost.body)).toBeDefined();
  expect(screen.queryByText(/Bought \$2,500/)).toBeNull();

  const likeBtn = screen.getByRole("button", { name: "Like thesis" });
  expect(likeBtn.textContent).toContain("4");
  fireEvent.click(likeBtn);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Unlike thesis" }).textContent).toContain("5"),
  );
  liked = true;
  await act(async () => likeReq.resolve({ response: new Response(null, { status: 204 }) }));
  expect(put).toHaveBeenCalledWith("/v1/posts/{id}/reaction", {
    params: { path: { id: thesisPost.id } },
    headers: { Authorization: "Bearer test-token" },
  });
});

it("publishes a thesis from the feed composer via POST /v1/tokens/{mint}/theses", async () => {
  routeGet({ feed: () => Promise.resolve(feedOk([thesisPost])) });
  post.mockResolvedValue(ok({ id: "new-thesis" }));
  renderFeed(signedIn);
  await screen.findByText(thesisPost.body);
  fireEvent.click(screen.getByRole("button", { name: "Write thesis" }));
  fireEvent.change(screen.getByLabelText("Thesis"), {
    target: { value: "SOL breakout with strong spot volume." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Publish thesis" }));
  await waitFor(() =>
    expect(post).toHaveBeenCalledWith("/v1/tokens/{mint}/theses", {
      params: { path: { mint: "sol" } },
      headers: { Authorization: "Bearer test-token" },
      body: { body: "SOL breakout with strong spot volume.", position: "long" },
    }),
  );
});

it("retries the failed cursor rather than refetching the already-loaded feed", async () => {
  let calls = 0;
  routeGet({
    feed: () => {
      calls += 1;
      if (calls === 1) return Promise.resolve(feedOk([thesisPost], "cursor-2"));
      if (calls === 2) return Promise.reject(new Error("Next page unavailable"));
      return Promise.resolve(feedOk([{ ...thesisPost, id: "second", body: "Recovered page." }]));
    },
  });
  renderFeed();
  await screen.findByText(thesisPost.body);
  fireEvent.click(screen.getByRole("button", { name: "Load more" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Couldn't load more posts.");
  expect(screen.getByText(thesisPost.body)).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("Recovered page.")).toBeDefined();
  const feedCalls = get.mock.calls.filter(([path]) => path === "/v1/feed");
  expect(feedCalls.map(([, options]) => options.params.query.cursor)).toEqual([
    undefined,
    "cursor-2",
    "cursor-2",
  ]);
});
