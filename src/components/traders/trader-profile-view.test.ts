// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { AuthContext, type AuthState, demoAuth } from "@/components/auth/auth-context";
import { TraderLink } from "@/components/common/trader-link";
import type { UserTrade } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { TraderProfileView } from "./trader-profile-view";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api: { GET: get },
}));

const wallet = "7UoqY5gZVcHjspNprmQ6WW1Lu73HrPwKSEj7ddEZ2UHw";
const mint = "So11111111111111111111111111111111111111112";
const profilePath = "/v1/traders/{wallet}";
const tradesPath = "/v1/traders/{wallet}/trades";
const stats = { pnlUsd: 2, pnlPct: 5, volumeUsd: 100, trades: 2, winRatePct: 50, rank: 9 };
const profile: components["schemas"]["TraderProfile"] = {
  wallet,
  handle: "Orca",
  avatarUrl: null,
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
  side: "buy",
  time: 1700000000,
  priceUsd: 100,
  valueUsd: 100,
  tokenAmount: 1,
  realizedPnlUsd: null,
};

function ok(data: unknown, source?: string) {
  return { data, response: new Response(null, { headers: source ? { "X-Data-Source": source } : {} }) };
}

const clients: QueryClient[] = [];
function renderProfile(auth = demoAuth) {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  clients.push(client);
  const tree = (value: AuthState) =>
    createElement(
      QueryClientProvider,
      { client },
      createElement(AuthContext, { value }, createElement(TraderProfileView, { wallet })),
    );
  const rendered = render(tree(auth));
  return { setAuth: (value: AuthState) => rendered.rerender(tree(value)) };
}

afterEach(() => {
  cleanup();
  for (const client of clients) client.clear();
  clients.length = 0;
  get.mockReset();
});

it("links names by wallet, not handle", () => {
  render(createElement(TraderLink, { wallet, handle: "Orca" }));
  expect(screen.getByRole("link", { name: "Orca" }).getAttribute("href")).toBe(`/traders/${wallet}`);
});

it("labels demo data, explains empty history, and switches window without another request", async () => {
  get
    .mockResolvedValueOnce(ok(profile, "demo"))
    .mockResolvedValueOnce(ok({ trades: [], nextCursor: null }, "demo"));
  renderProfile();
  expect(await screen.findByRole("heading", { name: "Orca" })).toBeDefined();
  expect(screen.getByText("Demo profile")).toBeDefined();
  expect(screen.getByText("Demo profiles don’t include positions.")).toBeDefined();
  expect(await screen.findByText("Demo profiles don’t include trade history.")).toBeDefined();
  expect(screen.queryByRole("link", { name: /Solana Explorer|Solscan/ })).toBeNull();
  expect(screen.getByText("#9")).toBeDefined();
  fireEvent.click(screen.getByRole("radio", { name: "24h" }));
  expect(screen.getByText("Unranked")).toBeDefined();
  fireEvent.click(screen.getByRole("radio", { name: "30d" }));
  expect(screen.getByText("#2")).toBeDefined();
  expect(get.mock.calls.map(([path]) => path)).toEqual([profilePath, tradesPath]);
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
  renderProfile();
  expect(await screen.findByRole("link", { name: "Solana Explorer" })).toBeDefined();
  expect((await screen.findByRole("link", { name: "Solscan" })).getAttribute("href")).toContain(
    trade.signature,
  );
  expect(screen.getByRole("link", { name: "SOL" }).getAttribute("href")).toBe(`/trade/${mint}`);
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
  const { setAuth } = renderProfile({
    ...demoAuth,
    configured: true,
    authenticated: true,
    walletAddress: "viewer-wallet",
    getAccessToken: async () => "access-token",
  });
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
