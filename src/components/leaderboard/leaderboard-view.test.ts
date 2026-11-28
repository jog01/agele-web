// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AuthContext, type AuthState, demoAuth } from "@/components/auth/auth-context";
import type { LeaderboardPage } from "@/lib/api/client";
import { LeaderboardView } from "./leaderboard-view";

const state = vi.hoisted(() => ({
  query: vi.fn(),
  replace: vi.fn(),
  refetch: vi.fn(),
  params: new URLSearchParams("window=7d"),
  follow: { isPending: false, isError: false, error: new Error("Could not update follow"), mutate: vi.fn() },
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/leaderboard",
  useSearchParams: () => state.params,
  useRouter: () => ({ replace: state.replace }),
}));
vi.mock("@/lib/api/queries", () => ({ useLeaderboard: state.query }));
vi.mock("@/hooks/use-follow", () => ({ useFollow: () => state.follow }));

const board: LeaderboardPage & { dataSource: "demo" | "indexed" } = {
  window: "7d",
  dataSource: "demo",
  entries: [
    {
      rank: 1,
      wallet: "test-wallet",
      handle: "Orca",
      pnlUsd: 250,
      pnlPct: 5,
      volumeUsd: 10000,
      trades: 12,
      winRatePct: 60,
      isFollowing: false,
    },
  ],
};
function renderBoard(auth: AuthState = demoAuth) {
  return render(createElement(AuthContext.Provider, { value: auth }, createElement(LeaderboardView)));
}
beforeEach(() => {
  vi.clearAllMocks();
  state.params = new URLSearchParams("window=7d");
  state.follow.isError = false;
  state.follow.isPending = false;
  state.query.mockReturnValue({
    data: undefined,
    isPending: true,
    isError: false,
    isFetching: true,
    refetch: state.refetch,
  });
});
afterEach(cleanup);

it("shows structured reduced-motion rows while keeping ranking-window controls usable", () => {
  const { getByRole, container, queryByText } = renderBoard();
  expect(getByRole("status").textContent).toBe("Loading rankings");
  expect(getByRole("status").closest('[aria-busy="true"]')).toBeNull();
  expect(getByRole("table", { name: "Trader rankings" }).getAttribute("aria-busy")).toBe("true");
  expect(container.querySelectorAll('tbody tr[aria-hidden="true"]')).toHaveLength(8);
  for (const block of container.querySelectorAll('[data-slot="skeleton"]'))
    expect(block.className).toContain("motion-reduce:animate-none");
  expect(queryByText("Loading rankings…")).toBeNull();
  expect(queryByText("Orca")).toBeNull();
  expect(container.textContent).not.toContain("$");
  fireEvent.click(getByRole("radio", { name: "30d" }));
  expect(state.replace).toHaveBeenCalledWith("/leaderboard?window=30d", { scroll: false });
});

it("renders loaded values and period-aware profile links without enabling signed-out follows", () => {
  state.query.mockReturnValue({ data: board, isPending: false });
  const { getByRole, getByText, container } = renderBoard();
  expect(getByText("Demo fixtures")).toBeDefined();
  expect(getByText("+$250.00")).toBeDefined();
  expect(getByRole("link", { name: "Orca" }).getAttribute("href")).toBe("/traders/test-wallet?window=7d");
  expect(getByRole("button", { name: "Follow Orca" }).hasAttribute("disabled")).toBe(true);
  expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
});

it("links to Positions without changing the current Traders window", () => {
  const { getByRole } = renderBoard();
  expect(getByRole("link", { name: "Traders" }).getAttribute("aria-current")).toBe("page");
  expect(getByRole("link", { name: "Positions" }).getAttribute("href")).toBe(
    "/leaderboard?window=7d&tab=positions",
  );
});

it("keeps existing rows during background refresh", () => {
  state.query.mockReturnValue({ data: board, isPending: false, isFetching: true });
  const { getByRole, container } = renderBoard();
  expect(getByRole("link", { name: "Orca" })).toBeDefined();
  expect(getByRole("status").textContent).toBe("Updating rankings…");
  expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
});

it("preserves the retry state and ranking controls when data fails", () => {
  state.query.mockReturnValue({ isPending: false, isError: true, refetch: state.refetch });
  const { getByRole } = renderBoard();
  expect(getByRole("alert").textContent).toBe("Rankings unavailable.");
  fireEvent.click(getByRole("button", { name: "Retry" }));
  expect(state.refetch).toHaveBeenCalledOnce();
  expect(getByRole("radio", { name: "7d" }).getAttribute("aria-checked")).toBe("true");
});

it("labels a failed background refresh while retaining the last snapshot", () => {
  state.query.mockReturnValue({ data: board, isPending: false, isError: true });
  const { getByRole } = renderBoard();
  expect(getByRole("alert").textContent).toContain("Showing the last snapshot");
  expect(getByRole("link", { name: "Orca" })).toBeDefined();
});

it("shows an honest empty state instead of a blank table", () => {
  state.query.mockReturnValue({ data: { ...board, entries: [] }, isPending: false });
  const { getByText, queryByRole } = renderBoard();
  expect(getByText("No rankings yet")).toBeDefined();
  expect(queryByRole("status")).toBeNull();
});

it("retains signed-in follow mutations and self-follow protection", () => {
  state.query.mockReturnValue({ data: { ...board, dataSource: "indexed" }, isPending: false });
  const auth = { ...demoAuth, configured: true, authenticated: true, walletAddress: "viewer-wallet" };
  const { getByRole, getByText, rerender } = renderBoard(auth);
  expect(getByText("Indexed trades")).toBeDefined();
  fireEvent.click(getByRole("button", { name: "Follow Orca" }));
  expect(state.follow.mutate).toHaveBeenCalledWith({ wallet: "test-wallet", isFollowing: true });
  rerender(
    createElement(
      AuthContext.Provider,
      { value: { ...auth, walletAddress: "test-wallet" } },
      createElement(LeaderboardView),
    ),
  );
  expect(getByRole("button", { name: "Follow Orca" }).hasAttribute("disabled")).toBe(true);
});

it("retains follow error feedback", () => {
  state.query.mockReturnValue({ data: board, isPending: false });
  state.follow.isError = true;
  const { getByRole } = renderBoard();
  expect(getByRole("alert").textContent).toContain("Could not update follow");
});
