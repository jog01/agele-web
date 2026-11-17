// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { AuthContext, type AuthState, demoAuth } from "@/components/auth/auth-context";
import { useSwap } from "@/hooks/use-swap";
import type { Token } from "@/lib/api/client";
import { QuoteReviewDialog } from "./quote-review-dialog";

const quoteState = vi.hoisted(() => ({
  available: true,
  error: null as Error | null,
  priceImpactPct: 0.1,
  feeBps: 25,
}));

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: () => ({
    data: quoteState.available
      ? {
          inAmount: "1234567891",
          outAmount: "150000000",
          otherAmountThreshold: "149000000",
          slippageBps: 50,
          priceImpactPct: quoteState.priceImpactPct,
          feeBps: quoteState.feeBps,
          router: "mock",
        }
      : undefined,
    error: quoteState.error,
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

afterEach(() => {
  cleanup();
  quoteState.available = true;
  quoteState.error = null;
  quoteState.priceImpactPct = 0.1;
  quoteState.feeBps = 25;
});

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

it.each([
  [1.23456789, "1.23%"],
  [0.000001, "<0.01%"],
  [0, "0.00%"],
] as const)("shows rounded impact and honest fee labels for impact %s", (impact, expected) => {
  quoteState.priceImpactPct = impact;
  quoteState.feeBps = 2;
  show();
  expect(screen.getByText("Price impact").parentElement?.textContent).toBe(`Price impact${expected}`);
  expect(screen.getByText("Route fee").parentElement?.textContent).toBe("Route fee0.02%");
  expect(screen.getByText("Platform fee").parentElement?.textContent).toBe("Platform fee—");
});

it("does not mix fixture prices with provider quotes or promise sponsorship", () => {
  show();
  expect(screen.queryByText("Demo price")).toBeNull();
  expect(screen.getByText("Not quoted")).toBeDefined();
  expect(screen.queryByText("Sponsored")).toBeNull();
  expect(screen.getByRole("alert").textContent).toContain("provider quote estimates");
});

it.each([null, new Error("Quote unavailable")])(
  "labels fixture prices when no quote is available (%s)",
  (error) => {
    quoteState.available = false;
    quoteState.error = error;
    show();
    expect(screen.getByText("Demo price")).toBeDefined();
    expect(screen.getByRole("alert").textContent).toContain("Estimates are not live quotes");
    expect(screen.getByText("Not quoted")).toBeDefined();
    expect(screen.getByText("Price impact").parentElement?.textContent).toBe("Price impact—");
    expect(screen.getByText("Route fee").parentElement?.textContent).toBe("Route fee—");
    expect(screen.getByText("Platform fee").parentElement?.textContent).toBe("Platform fee—");
  },
);
