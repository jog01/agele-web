// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { MarketExplorer } from "./market-explorer";
import { SearchDialog } from "./search-dialog";

const { fetchDetail, fetchTrending, push } = vi.hoisted(() => ({
  fetchDetail: vi.fn(),
  fetchTrending: vi.fn(),
  push: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
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

function openSearch() {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
  const onOpenChange = vi.fn();
  render(
    createElement(QueryClientProvider, { client }, createElement(SearchDialog, { open: true, onOpenChange })),
  );
  return { input: screen.getByRole("searchbox"), onOpenChange };
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
  fetchTrending.mockResolvedValue([SOL]);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
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
