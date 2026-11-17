// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext, demoAuth } from "@/components/auth/auth-context";
import { PortfolioView } from "./portfolio-view";

vi.mock("@/hooks/use-portfolio", () => ({
  usePortfolio: () => ({ data: undefined, isError: true, isPending: false }),
}));
afterEach(cleanup);

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
