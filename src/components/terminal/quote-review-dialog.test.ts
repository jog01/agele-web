// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { AuthContext, type AuthState, demoAuth } from "@/components/auth/auth-context";
import { useSwap } from "@/hooks/use-swap";
import type { Token } from "@/lib/api/client";
import { QuoteReviewDialog } from "./quote-review-dialog";

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: {
      inAmount: "1234567891",
      outAmount: "150000000",
      otherAmountThreshold: "149000000",
      slippageBps: 50,
      priceImpactPct: 0.1,
      feeBps: 25,
      router: "mock",
    },
    error: null,
  }),
}));
vi.mock("@/hooks/use-market-data-source", () => ({ useMarketDataMode: () => ({ demoMode: true }) }));

const token: Token = {
  mint: "So11111111111111111111111111111111111111112",
  symbol: "SOL",
  name: "Solana",
  decimals: 9,
  imageUrl: null,
  priceUsd: 150,
  priceChange24hPct: 0,
  marketCapUsd: 0,
  liquidityUsd: 0,
  volume24hUsd: 0,
  holders: 0,
};

function Review() {
  const swap = useSwap(token, "sell", "1.234567891", 150);
  return createElement(QuoteReviewDialog, {
    open: true,
    onOpenChange: () => {},
    token,
    side: "sell",
    amount: swap.inputAmount ?? "—",
    price: 150,
    receive: swap.receive ?? "—",
    minReceive: swap.minReceive ?? "—",
    swap,
  });
}

function show(auth: AuthState = demoAuth) {
  render(createElement(AuthContext, { value: auth }, createElement(Review)));
  return screen.getByRole("button", { name: "Confirm sell SOL" }) as HTMLButtonElement;
}

afterEach(cleanup);

it("disables Confirm with an honest status in no-Privy demo mode despite a valid quote", () => {
  const confirm = show();
  expect(confirm.disabled).toBe(true);
  expect(screen.getByRole("status").textContent).toContain("Trading is unavailable in demo");
});

it("prompts sign-in when Privy is configured and the user is signed out", () => {
  const login = vi.fn();
  const confirm = show({ ...demoAuth, configured: true, login });
  expect(confirm.disabled).toBe(false);
  expect(screen.getByRole("status").textContent).toContain("Trading needs sign-in");
  fireEvent.click(confirm);
  expect(login).toHaveBeenCalledTimes(1);
});

it("disables Confirm when signed in without an available signer", () => {
  const confirm = show({ ...demoAuth, configured: true, authenticated: true });
  expect(confirm.disabled).toBe(true);
  expect(screen.getByRole("status").textContent).toContain("embedded wallet is ready");
});

it("shows the exact entered SOL amount without four-decimal display rounding", () => {
  show();
  expect(screen.getByText("1.234567891 SOL", { exact: true })).toBeDefined();
  expect(screen.queryByText("1.2346 SOL", { exact: true })).toBeNull();
});
