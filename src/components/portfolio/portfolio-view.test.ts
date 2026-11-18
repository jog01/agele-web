// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext, demoAuth } from "@/components/auth/auth-context";
import type { Portfolio } from "@/lib/api/client";
import { PortfolioView } from "./portfolio-view";

const query = vi.hoisted(() => ({
  data: undefined as Portfolio | undefined,
  isError: true,
  isPending: false,
  isFetching: false,
  refetch: vi.fn(),
}));
vi.mock("@/hooks/use-portfolio", () => ({ usePortfolio: () => query }));
beforeEach(() => {
  Object.assign(query, { data: undefined, isError: true, isPending: false, isFetching: false });
  query.refetch.mockReset();
});
afterEach(cleanup);

const signedIn = { ...demoAuth, configured: true, authenticated: true };
const snapshot: Portfolio = {
  equityUsd: 1250,
  usdcBalance: 1000,
  unrealizedPnlUsd: 250,
  realizedPnlUsd: 50,
  positions: [],
};

function renderPortfolio(auth = signedIn) {
  const tree = () => createElement(AuthContext.Provider, { value: auth }, createElement(PortfolioView));
  const rendered = render(tree());
  return { ...rendered, update: () => rendered.rerender(tree()) };
}

describe("PortfolioView loading", () => {
  it("uses the matched skeleton while auth initializes, without showing a sign-in gate", () => {
    const { getByRole, queryByRole } = renderPortfolio({ ...demoAuth, ready: false, configured: true });
    expect(getByRole("status", { name: "Loading portfolio" }).getAttribute("aria-busy")).toBeNull();
    expect(queryByRole("button", { name: "Sign in" })).toBeNull();
  });

  it("replaces authenticated pending data with skeleton metrics and content, then reveals actual balances", () => {
    Object.assign(query, { isPending: true, isError: false });
    const { getByRole, queryByRole, getByText, container, update } = renderPortfolio();
    expect(getByRole("status", { name: "Loading portfolio" })).toBeDefined();
    const blocks = container.querySelectorAll('[data-slot="skeleton"]');
    expect(blocks.length).toBeGreaterThanOrEqual(10);
    for (const block of blocks) expect(block.className).toContain("motion-reduce:animate-none");
    expect(container.textContent).not.toContain("$");
    expect(container.textContent).not.toContain("Loading portfolio…");
    Object.assign(query, { isPending: false, data: snapshot });
    update();
    expect(queryByRole("status", { name: "Loading portfolio" })).toBeNull();
    expect(getByText("$1,250.00")).toBeDefined();
    expect(getByText("Your portfolio")).toBeDefined();
  });

  it("does not mistake a disabled signed-out query for pending user data", () => {
    Object.assign(query, { isPending: true, isError: false });
    const { queryByRole, getByRole } = renderPortfolio({ ...demoAuth, configured: true });
    expect(queryByRole("status", { name: "Loading portfolio" })).toBeNull();
    expect(getByRole("button", { name: "Sign in" })).toBeDefined();
    expect(getByRole("button", { name: "Deposit" }).hasAttribute("disabled")).toBe(true);
  });

  it("keeps the last loaded metrics visible during background refresh", () => {
    Object.assign(query, { data: snapshot, isError: false, isFetching: true });
    const { getByText, getByRole, container } = renderPortfolio();
    expect(getByText("$1,250.00")).toBeDefined();
    expect(getByRole("status").textContent).toBe("Updating portfolio…");
    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
  });

  it("keeps the empty-state guidance after a successful zero-balance response", () => {
    Object.assign(query, {
      data: { ...snapshot, equityUsd: 0, usdcBalance: 0, unrealizedPnlUsd: 0, realizedPnlUsd: 0 },
      isError: false,
    });
    const { getByText } = renderPortfolio();
    expect(getByText("Your portfolio starts here")).toBeDefined();
  });

  it("offers a retry after an authenticated error", () => {
    const { getByRole } = renderPortfolio();
    expect(getByRole("alert").textContent).toContain("could not be loaded");
    fireEvent.click(getByRole("button", { name: "Retry" }));
    expect(query.refetch).toHaveBeenCalledOnce();
  });
});

describe("PortfolioView demo notice", () => {
  it("explains disabled sign-in before empty metrics in demo mode", () => {
    const { container, getByText } = render(createElement(PortfolioView));
    const notice = getByText(/Sign-in is disabled in this demo build/);
    expect(notice.compareDocumentPosition(getByText("Total equity")) & 4).toBe(4);
    expect(container.textContent?.match(/Sign-in is disabled/g)).toHaveLength(1);
  });

  it("keeps configured sign-in guidance without the demo notice", () => {
    const { queryByText, getByRole } = render(
      createElement(
        AuthContext.Provider,
        { value: { ...demoAuth, configured: true } },
        createElement(PortfolioView),
      ),
    );
    expect(queryByText(/Sign-in is disabled/)).toBeNull();
    expect(getByRole("button", { name: "Sign in" })).toBeDefined();
  });

  it("keeps authenticated portfolio errors without the demo notice", () => {
    const { queryByText, getByText } = render(
      createElement(
        AuthContext.Provider,
        { value: { ...demoAuth, configured: true, authenticated: true } },
        createElement(PortfolioView),
      ),
    );
    expect(queryByText(/Sign-in is disabled/)).toBeNull();
    expect(getByText("Balances and PnL could not be loaded. Please try again later.")).toBeDefined();
  });
});
