// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { AuthContext, type AuthState, demoAuth } from "@/components/auth/auth-context";
import { TraderLink } from "@/components/common/trader-link";
import type { LeaderboardWindow, UserTrade } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { TraderProfileView } from "./trader-profile-view";

const { get, put, del } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), del: vi.fn() }));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api: { GET: get, PUT: put, DELETE: del },
}));

const wallet = "7UoqY5gZVcHjspNprmQ6WW1Lu73HrPwKSEj7ddEZ2UHw";
const mint = "So11111111111111111111111111111111111111112";
const profilePath = "/v1/traders/{wallet}";
const tradesPath = "/v1/traders/{wallet}/trades";
const stats = { pnlUsd: 2, pnlPct: 5, volumeUsd: 100, trades: 2, winRatePct: 50, rank: 9 };
const profile: components["schemas"]["TraderProfile"] = {
  wallet,
  handle: "Orca",
  displayName: null,
  avatarUrl: null,
  bio: null,
  followers: 30,
  following: 5,
  realizedPnlUsd: 10,
  unrealizedPnlUsd: -20,
  positions: [],
  stats: { "24h": { ...stats, rank: null }, "7d": stats, "30d": { ...stats, rank: 2 } },
};
const trade: UserTrade = {
  id: "first",
  signature: "indexed-signature",
  mint,
  symbol: "SOL",
  imageUrl: null,
  side: "buy",
  time: 1700000000,
  priceUsd: 100,
  valueUsd: 100,
  tokenAmount: 1,
  realizedPnlUsd: null,
};
const signedIn: AuthState = {
  ...demoAuth,
  configured: true,
  authenticated: true,
  walletAddress: "viewer-wallet",
  getAccessToken: async () => "access-token",
};

function ok(data: unknown, source?: string) {
  return { data, response: new Response(null, { headers: source ? { "X-Data-Source": source } : {} }) };
}

const clients: QueryClient[] = [];
function renderProfile(auth = demoAuth, initialWindow?: LeaderboardWindow) {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  clients.push(client);
  const tree = (value: AuthState) =>
    createElement(
      QueryClientProvider,
      { client },
      createElement(AuthContext, { value }, createElement(TraderProfileView, { wallet, initialWindow })),
    );
  const rendered = render(tree(auth));
  return { client, setAuth: (value: AuthState) => rendered.rerender(tree(value)) };
}

afterEach(() => {
  cleanup();
  for (const client of clients) client.clear();
  clients.length = 0;
  get.mockReset();
  put.mockReset();
  del.mockReset();
});

it("replaces the profile skeleton before independently resolving trade history", async () => {
  let resolveProfile!: (value: ReturnType<typeof ok>) => void;
  let resolveTrades!: (value: ReturnType<typeof ok>) => void;
  const profileRequest = new Promise<ReturnType<typeof ok>>((resolve) => {
    resolveProfile = resolve;
  });
  const tradesRequest = new Promise<ReturnType<typeof ok>>((resolve) => {
    resolveTrades = resolve;
  });
  get.mockImplementation((path) => (path === profilePath ? profileRequest : tradesRequest));
  renderProfile();
  expect(screen.getByRole("status", { name: "Loading trader profile" })).toBeDefined();
  expect(screen.queryByRole("heading", { name: "Orca" })).toBeNull();
  await act(async () => resolveProfile(ok(profile, "demo")));
  expect(await screen.findByRole("heading", { name: "Orca" })).toBeDefined();
  expect(screen.queryByRole("status", { name: "Loading trader profile" })).toBeNull();
  expect(screen.getByRole("status", { name: "Loading trades" })).toBeDefined();
  await act(async () => resolveTrades(ok({ trades: [], nextCursor: null }, "demo")));
  expect(await screen.findByText("No trades yet.")).toBeDefined();
  expect(screen.queryByRole("status", { name: "Loading trades" })).toBeNull();
});

it("retains profile content rather than returning to a full skeleton on background refresh", async () => {
  let resolveRefresh!: (value: ReturnType<typeof ok>) => void;
  const refresh = new Promise<ReturnType<typeof ok>>((resolve) => {
    resolveRefresh = resolve;
  });
  get
    .mockResolvedValueOnce(ok(profile, "demo"))
    .mockResolvedValueOnce(ok({ trades: [], nextCursor: null }, "demo"))
    .mockReturnValueOnce(refresh);
  const { client } = renderProfile();
  await screen.findByText("No trades yet.");
  act(() => {
    void client.invalidateQueries({ queryKey: ["trader"] });
  });
  await waitFor(() => expect(get).toHaveBeenCalledTimes(3));
  expect(screen.getByRole("heading", { name: "Orca" })).toBeDefined();
  expect(screen.queryByRole("status", { name: "Loading trader profile" })).toBeNull();
  await act(async () => resolveRefresh(ok({ ...profile, followers: 31 }, "demo")));
  expect(await screen.findByText("31")).toBeDefined();
});

it("links names by wallet and preserves the source ranking window", () => {
  render(createElement(TraderLink, { wallet, handle: "Orca", window: "24h" }));
  expect(screen.getByRole("link", { name: "Orca" }).getAttribute("href")).toBe(
    `/traders/${wallet}?window=24h`,
  );
});

it("labels demo data, explains empty history, and switches window without another request", async () => {
  get
    .mockResolvedValueOnce(ok(profile, "demo"))
    .mockResolvedValueOnce(ok({ trades: [], nextCursor: null }, "demo"));
  renderProfile();
  expect(await screen.findByRole("heading", { name: "Orca" })).toBeDefined();
  expect((await screen.findByText("Trader profile: Orca")).getAttribute("role")).toBe("status");
  expect(screen.getByText("Demo profile")).toBeDefined();
  expect(screen.getByText("Sign-in isn’t configured, so following is unavailable.")).toBeDefined();
  expect(screen.getByText("No open positions.")).toBeDefined();
  expect(await screen.findByText("No trades yet.")).toBeDefined();
  expect(screen.queryByRole("link", { name: /Solana Explorer|Solscan/ })).toBeNull();
  expect(screen.getByText("#9")).toBeDefined();
  fireEvent.click(screen.getByRole("radio", { name: "24h" }));
  expect(screen.getByText("Unranked")).toBeDefined();
  fireEvent.click(screen.getByRole("radio", { name: "30d" }));
  expect(screen.getByText("#2")).toBeDefined();
  expect(get.mock.calls.map(([path]) => path)).toEqual([profilePath, tradesPath]);
});

it("opens in the source ranking window and offers sign-in when configured", async () => {
  const login = vi.fn();
  get
    .mockResolvedValueOnce(ok(profile, "demo"))
    .mockResolvedValueOnce(ok({ trades: [], nextCursor: null }, "demo"));
  renderProfile({ ...demoAuth, configured: true, login }, "24h");
  expect(await screen.findByText("Unranked")).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Sign in to follow" }));
  expect(login).toHaveBeenCalledOnce();
});

it("uses the opaque next cursor, preserves trades after a failed page, and retries that page", async () => {
  const cursor = "opaque=/+";
  get
    .mockResolvedValueOnce(ok(profile, "indexed"))
    .mockResolvedValueOnce(ok({ trades: [trade], nextCursor: cursor }, "indexed"))
    .mockResolvedValueOnce({ response: new Response(null, { status: 400 }) })
    .mockResolvedValueOnce(
      ok({ trades: [{ ...trade, id: "second", side: "sell", symbol: "BONK" }], nextCursor: null }),
    );
  const { client } = renderProfile();
  const imageUrl = "https://example.com/sol.webp";
  client.setQueryData(["tokens", "trending"], [{ mint, imageUrl }]);
  expect(await screen.findByRole("link", { name: "Solana Explorer" })).toBeDefined();
  expect((await screen.findByRole("link", { name: "Solscan" })).getAttribute("href")).toContain(
    trade.signature,
  );
  expect(screen.getByRole("link", { name: "SOL" }).getAttribute("href")).toBe(`/trade/${mint}`);
  expect(screen.getByRole("link", { name: "SOL" }).querySelector("img")?.getAttribute("src")).toBe(imageUrl);
  fireEvent.click(screen.getByRole("button", { name: "Load more trades" }));
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Couldn’t load more trades.");
  expect(screen.getByText("Buy")).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("Sell")).toBeDefined();
  expect(screen.getAllByRole("link", { name: "Solscan" })).toHaveLength(1);
  expect(screen.queryByRole("button", { name: "Load more trades" })).toBeNull();
  expect(get.mock.calls.slice(1).map(([, options]) => options.params)).toEqual([
    { path: { wallet }, query: { limit: 25, cursor: undefined } },
    { path: { wallet }, query: { limit: 25, cursor } },
    { path: { wallet }, query: { limit: 25, cursor } },
  ]);
});

it("renders displayName, bio, and API-provided position imageUrl when present", async () => {
  const imageUrl = "https://example.com/sol-direct.webp";
  get
    .mockResolvedValueOnce(
      ok(
        {
          ...profile,
          displayName: "Orca Prime",
          bio: "Momentum trader tracking Solana liquidity.",
          positions: [
            {
              mint,
              symbol: "SOL",
              imageUrl,
              quantity: 2,
              avgCostUsd: 100,
              priceUsd: 120,
              valueUsd: 240,
              unrealizedPnlUsd: 40,
              realizedPnlUsd: 10,
            },
          ],
        },
        "demo",
      ),
    )
    .mockResolvedValueOnce(ok({ trades: [], nextCursor: null }, "demo"));
  renderProfile();
  expect(await screen.findByRole("heading", { name: "Orca Prime" })).toBeDefined();
  expect(screen.getByText("@Orca")).toBeDefined();
  expect(screen.getByText("Momentum trader tracking Solana liquidity.")).toBeDefined();
  const link = await screen.findByRole("link", { name: "SOL" });
  expect(link.querySelector("img")?.getAttribute("src")).toBe(imageUrl);
});

it("renders indexed positions and skips nullable entries from the API", async () => {
  get
    .mockResolvedValueOnce(
      ok(
        {
          ...profile,
          positions: [
            null,
            {
              mint,
              symbol: "SOL",
              quantity: 1,
              avgCostUsd: 100,
              priceUsd: 80,
              valueUsd: 80,
              unrealizedPnlUsd: -20,
              realizedPnlUsd: 0,
            },
          ],
        },
        "indexed",
      ),
    )
    .mockResolvedValueOnce(ok({ trades: [], nextCursor: null }, "indexed"));
  const { client } = renderProfile();
  const imageUrl = "https://example.com/sol.webp";
  client.setQueryData(["tokens", mint], { mint, imageUrl });
  const link = await screen.findByRole("link", { name: "SOL" });
  expect(link.getAttribute("href")).toBe(`/trade/${mint}`);
  expect(link.querySelector("img")?.getAttribute("src")).toBe(imageUrl);
  expect(screen.getByRole("table", { name: "Open positions" }).textContent).toContain("-$20.00");
  expect(await screen.findByText("No trades yet.")).toBeDefined();
});

it("distinguishes a missing trader from an outage", async () => {
  get
    .mockResolvedValueOnce({ response: new Response(null, { status: 503 }) })
    .mockResolvedValueOnce({ response: new Response(null, { status: 503 }) })
    .mockResolvedValueOnce({ response: new Response(null, { status: 404 }) });
  renderProfile();
  expect(await screen.findByRole("heading", { name: "Profile unavailable" })).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByRole("heading", { name: "Trader not found" })).toBeDefined();
  expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  expect(get.mock.calls.map(([path]) => path)).toEqual([profilePath, profilePath, profilePath]);
});

it("uses bearer auth without showing the previous viewer’s following state after sign-out", async () => {
  get
    .mockResolvedValueOnce(ok({ ...profile, isFollowing: true }, "indexed"))
    .mockResolvedValueOnce(ok({ trades: [], nextCursor: null }, "indexed"))
    .mockResolvedValueOnce(ok(profile, "indexed"))
    .mockResolvedValueOnce(ok({ trades: [], nextCursor: null }, "indexed"));
  const { setAuth } = renderProfile(signedIn);
  expect(await screen.findByText("Following")).toBeDefined();
  expect(await screen.findByText("No trades yet.")).toBeDefined();
  setAuth(demoAuth);
  expect(await screen.findByRole("heading", { name: "Orca" })).toBeDefined();
  expect(await screen.findByText("No trades yet.")).toBeDefined();
  expect(screen.queryByText("Following")).toBeNull();
  expect(get.mock.calls.map(([, options]) => options.headers)).toEqual([
    { Authorization: "Bearer access-token" },
    { Authorization: "Bearer access-token" },
    undefined,
    undefined,
  ]);
});

it("follows and unfollows with the viewer token, refreshing counts and follow state", async () => {
  get
    .mockResolvedValueOnce(ok({ ...profile, isFollowing: false }, "indexed"))
    .mockResolvedValueOnce(ok({ trades: [], nextCursor: null }, "indexed"))
    .mockResolvedValueOnce(ok({ ...profile, followers: 31, isFollowing: true }, "indexed"))
    .mockResolvedValueOnce(ok({ ...profile, isFollowing: false }, "indexed"));
  put.mockResolvedValue({ response: new Response(null, { status: 204 }) });
  del.mockResolvedValue({ response: new Response(null, { status: 204 }) });
  renderProfile(signedIn);
  await screen.findByText("No trades yet.");
  fireEvent.click(screen.getByRole("button", { name: "Follow" }));
  expect(await screen.findByText("31")).toBeDefined();
  fireEvent.click(await screen.findByRole("button", { name: "Unfollow" }));
  expect(await screen.findByText("30")).toBeDefined();
  expect(screen.getByRole("button", { name: "Follow" })).toBeDefined();
  const args = [
    "/v1/follows/{wallet}",
    { params: { path: { wallet } }, headers: { Authorization: "Bearer access-token" } },
  ];
  expect(put).toHaveBeenCalledExactlyOnceWith(...args);
  expect(del).toHaveBeenCalledExactlyOnceWith(...args);
});
