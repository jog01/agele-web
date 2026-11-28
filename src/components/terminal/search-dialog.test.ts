// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { search } from "@/lib/api/search";
import { useTerminalStore } from "@/stores/terminal";
import { MarketExplorer } from "./market-explorer";
import { SearchDialog } from "./search-dialog";

const { fetchDetail, fetchTrending, priceListeners, push } = vi.hoisted(() => ({
  fetchDetail: vi.fn(),
  fetchTrending: vi.fn(),
  priceListeners: new Map<string, (data: unknown) => void>(),
  push: vi.fn(),
}));
vi.mock("@/lib/realtime", () => ({
  realtime: {
    subscribe: (topic: string, listener: (data: unknown) => void) => {
      priceListeners.set(topic, listener);
      return () => priceListeners.delete(topic);
    },
    onReconnect: () => () => {},
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/api/search", () => ({ search: vi.fn() }));
vi.mock("@/lib/api/queries", () => ({
  useTrending: () => ({ data: [SOL], isPending: false, isError: false }),
  tokenQueries: {
    trending: () => ({ queryKey: ["tokens", "trending"], queryFn: fetchTrending }),
    detail: (mint: string) => ({ queryKey: ["tokens", mint], queryFn: () => fetchDetail(mint) }),
  },
}));

const SOL = {
  mint: "So11111111111111111111111111111111111111112",
  symbol: "SOL",
  name: "Wrapped SOL",
  priceUsd: 182.4,
  priceChange24hPct: 1,
};
const MINT = "1".repeat(32);
const JUP = {
  ...SOL,
  mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  symbol: "JUP",
  name: "Jupiter",
  marketCapUsd: 1_000,
};

function openSearch() {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
  const onOpenChange = vi.fn();
  render(
    createElement(QueryClientProvider, { client }, createElement(SearchDialog, { open: true, onOpenChange })),
  );
  return { input: screen.getByRole("searchbox"), onOpenChange };
}

function SearchHarness() {
  const [open, setOpen] = useState(false);
  return createElement(
    "div",
    null,
    createElement("button", { type: "button", onClick: () => setOpen(true) }, "Open search"),
    createElement(SearchDialog, { open, onOpenChange: setOpen }),
  );
}

it("returns focus to a controlled search opener after Escape", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
  render(createElement(QueryClientProvider, { client }, createElement(SearchHarness)));
  const trigger = screen.getByRole("button", { name: "Open search" });
  trigger.focus();
  fireEvent.click(trigger);
  expect(await screen.findByRole("searchbox")).toBeDefined();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
  fetchTrending.mockResolvedValue([SOL]);
  vi.mocked(search).mockResolvedValue({ tokens: [], traders: [], tokensUnavailable: false });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  useTerminalStore.setState({ watchlist: [] });
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

const DANI = {
  wallet: "8WXzZbMabmHH7jddkSPkSkrUbTfkfiWiS9onqwmyUvFM",
  handle: "solails",
  displayName: "Dani",
  avatarUrl: null,
};

describe("SearchDialog mixed search", () => {
  it("groups API results and moves keyboard selection from a token to a trader", async () => {
    const token = {
      ...SOL,
      decimals: 9,
      imageUrl: null,
      marketCapUsd: 1000,
      liquidityUsd: 500,
      volume24hUsd: 25,
      holders: 4,
    };
    vi.mocked(search).mockResolvedValue({ tokens: [token], traders: [DANI], tokensUnavailable: false });
    const { input } = openSearch();
    fireEvent.change(input, { target: { value: " SOL " } });
    expect(screen.getByText("Searching…")).toBeTruthy();
    expect(vi.mocked(search)).not.toHaveBeenCalled();
    expect(
      await within(await screen.findByRole("region", { name: "Tokens" })).findByRole("button", {
        name: /Wrapped SOL/,
      }),
    ).toBeTruthy();
    const trader = within(screen.getByRole("region", { name: "Traders" })).getByRole("button", {
      name: /Dani.*@solails.*8WXz/,
    });
    expect(vi.mocked(search)).toHaveBeenCalledExactlyOnceWith("SOL", expect.any(AbortSignal));
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.getAttribute("aria-activedescendant")).toBe(trader.id);
    fireEvent.submit(input.closest("form")!);
    expect(push).toHaveBeenCalledWith(`/traders/${DANI.wallet}`);
  });

  it("shows trader matches alongside partial token availability and lets users filter", async () => {
    vi.mocked(search).mockResolvedValue({ tokens: [], traders: [DANI], tokensUnavailable: true });
    fetchDetail.mockRejectedValue(new ApiError("Unknown mint", 404));
    const { input } = openSearch();
    fireEvent.change(input, { target: { value: DANI.wallet } });
    expect(await screen.findByText("Some token results may be unavailable.")).toBeTruthy();
    expect(screen.queryByText("No matches found.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Traders" }));
    expect(screen.queryByText("Some token results may be unavailable.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Dani/ }));
    expect(push).toHaveBeenCalledWith(`/traders/${DANI.wallet}`);
  });

  it("distinguishes no matches from request failures", async () => {
    vi.mocked(search).mockResolvedValueOnce({ tokens: [], traders: [], tokensUnavailable: false });
    vi.mocked(search).mockRejectedValueOnce(new ApiError("Unavailable", 503));
    const { input } = openSearch();
    fireEvent.change(input, { target: { value: "nothing" } });
    expect(await screen.findByText("No matches found.")).toBeTruthy();
    fireEvent.change(input, { target: { value: "failed" } });
    expect(await screen.findByText("Search unavailable. Try again.")).toBeTruthy();
    expect(screen.queryByText("No matches found.")).toBeNull();
  });

  it("only persists selected token mints and clears them separately from the watchlist", async () => {
    useTerminalStore.setState({ watchlist: [SOL.mint] });
    const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
    render(createElement(QueryClientProvider, { client }, createElement(SearchHarness)));
    fireEvent.click(screen.getByRole("button", { name: "Open search" }));
    fireEvent.click(await screen.findByRole("button", { name: /Wrapped SOL/ }));
    expect(localStorage.getItem("agele:search:recent-mints")).toBe(JSON.stringify([SOL.mint]));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Open search" }));
    const recents = await screen.findByRole("region", { name: "Recent tokens" });
    expect(within(recents).getByRole("button", { name: /Wrapped SOL/ })).toBeTruthy();
    fireEvent.click(within(recents).getByRole("button", { name: "Clear all" }));
    expect(localStorage.getItem("agele:search:recent-mints")).toBeNull();
    expect(useTerminalStore.getState().watchlist).toEqual([SOL.mint]);
  });

  it("keeps manual paste available when the clipboard is denied", async () => {
    const { input } = openSearch();
    const readText = vi.fn().mockRejectedValue(new Error("Permission denied"));
    vi.stubGlobal("navigator", Object.assign(Object.create(window.navigator), { clipboard: { readText } }));
    fireEvent.click(screen.getByRole("button", { name: "Paste address" }));
    expect(await screen.findByText(/Paste directly into the search field/)).toBeTruthy();
    expect(document.activeElement).toBe(input);
    expect(readText).toHaveBeenCalledTimes(1);
  });
});

describe("SearchDialog contract address lookup", () => {
  it("looks up a case-sensitive address outside trending and opens it with Enter", async () => {
    const mint = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN";
    fetchDetail.mockResolvedValue({ ...SOL, mint, symbol: "JUP", name: "Jupiter" });
    const { input, onOpenChange } = openSearch();
    fireEvent.change(input, { target: { value: ` ${mint} ` } });

    expect(await screen.findByRole("button", { name: /Jupiter/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Wrapped SOL/ })).toBeNull();
    expect(fetchDetail).toHaveBeenCalledExactlyOnceWith(mint);
    const form = input.closest("form");
    if (!form) throw new Error("Missing search form");
    fireEvent.submit(form);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(push).toHaveBeenCalledWith(`/trade/${mint}`);
  });

  it("shows a loading row while the lookup is pending and does not show the empty state", () => {
    fetchDetail.mockReturnValue(new Promise(() => {}));
    const { input } = openSearch();
    fireEvent.change(input, { target: { value: MINT } });

    expect(screen.getByRole("status").textContent).toBe("Looking up token…");
    expect(screen.queryByText("No token found for this address.")).toBeNull();
  });

  it("shows the not-found state on a 404 without retrying", async () => {
    fetchDetail.mockRejectedValue(new ApiError("Token not found", 404));
    const { input } = openSearch();
    fireEvent.change(input, { target: { value: MINT } });

    expect(await screen.findByText("No token found for this address.")).toBeTruthy();
    expect(fetchDetail).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("uses known trending data without an extra fetch and opens it by click", async () => {
    const { input } = openSearch();
    await screen.findByRole("button", { name: /Wrapped SOL/ });
    fireEvent.change(input, { target: { value: ` ${SOL.mint} ` } });
    fireEvent.click(screen.getByRole("button", { name: /Wrapped SOL/ }));

    expect(fetchDetail).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith(`/trade/${SOL.mint}`);
  });
});

it("finds a mint outside trending in the Markets filter", async () => {
  const mint = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN";
  fetchDetail.mockResolvedValue({ ...SOL, mint, symbol: "JUP", marketCapUsd: 1_000 });
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
  render(
    createElement(QueryClientProvider, { client }, createElement(MarketExplorer, { activeMint: SOL.mint })),
  );

  fireEvent.change(screen.getByRole("searchbox", { name: "Filter markets" }), {
    target: { value: ` ${mint} ` },
  });

  expect((await screen.findByRole("link", { name: /JUP/ })).getAttribute("href")).toBe(`/trade/${mint}`);
  expect(fetchDetail).toHaveBeenCalledExactlyOnceWith(mint);
});

it("keeps a starred non-trending result in the watchlist when the filter is cleared", async () => {
  fetchDetail.mockResolvedValue(JUP);
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0, staleTime: 10_000 } } });
  render(
    createElement(QueryClientProvider, { client }, createElement(MarketExplorer, { activeMint: SOL.mint })),
  );
  const input = screen.getByRole("searchbox", { name: "Filter markets" });
  fireEvent.change(input, { target: { value: JUP.mint } });
  fireEvent.click(await screen.findByRole("button", { name: "Add JUP to watchlist" }));
  fireEvent.change(input, { target: { value: "" } });
  fireEvent.click(screen.getByText("Watchlist"));

  const watchlist = within(screen.getByLabelText("Watchlist"));
  expect((await watchlist.findByRole("link", { name: /JUP/ })).getAttribute("href")).toBe(
    `/trade/${JUP.mint}`,
  );
  expect(fetchDetail).toHaveBeenCalledExactlyOnceWith(JUP.mint);
});

it("loads saved non-trending mints, reuses trending data, and skips a 404", async () => {
  const pending = Promise.withResolvers<typeof JUP>();
  fetchDetail.mockImplementation((mint: string) =>
    mint === JUP.mint ? pending.promise : Promise.reject(new ApiError("Token not found", 404)),
  );
  useTerminalStore.setState({ watchlist: [SOL.mint, JUP.mint, MINT] });
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
  render(
    createElement(QueryClientProvider, { client }, createElement(MarketExplorer, { activeMint: SOL.mint })),
  );
  fireEvent.click(screen.getByText("Watchlist"));
  const watchlist = within(screen.getByLabelText("Watchlist"));
  expect(await watchlist.findByText("Loading watched token…", { selector: "span" })).toBeTruthy();
  expect(watchlist.getByRole("link", { name: /SOL/ })).toBeTruthy();
  pending.resolve(JUP);

  expect(await watchlist.findByRole("link", { name: /JUP/ })).toBeTruthy();
  await waitFor(() => expect(watchlist.queryByRole("status")).toBeNull());
  expect(watchlist.getAllByRole("link")).toHaveLength(2);
  expect(fetchDetail.mock.calls).toEqual([[JUP.mint], [MINT]]);
});

it("updates non-trending watchlist prices and removes subscriptions on unstar and unmount", async () => {
  const bonk = { ...JUP, mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", symbol: "BONK" };
  fetchDetail.mockImplementation(async (mint: string) => (mint === JUP.mint ? JUP : bonk));
  useTerminalStore.setState({ watchlist: [SOL.mint, JUP.mint, bonk.mint] });
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
  const { unmount } = render(
    createElement(QueryClientProvider, { client }, createElement(MarketExplorer, { activeMint: SOL.mint })),
  );
  fireEvent.click(screen.getByText("Watchlist"));
  const watchlist = within(screen.getByLabelText("Watchlist"));
  await watchlist.findByRole("link", { name: /JUP/ });
  await watchlist.findByRole("link", { name: /BONK/ });
  const jupTopic = `token:${JUP.mint}:price`;
  const bonkTopic = `token:${bonk.mint}:price`;
  expect([...priceListeners.keys()].sort()).toEqual([bonkTopic, jupTopic]);

  act(() => priceListeners.get(jupTopic)?.({ mint: JUP.mint, priceUsd: 200, marketCapUsd: 2_000, time: 1 }));
  expect(await watchlist.findByText("$200.00")).toBeTruthy();
  fireEvent.click(watchlist.getByRole("button", { name: "Remove JUP from watchlist" }));
  expect([...priceListeners.keys()]).toEqual([bonkTopic]);
  unmount();
  expect(priceListeners.size).toBe(0);
});
