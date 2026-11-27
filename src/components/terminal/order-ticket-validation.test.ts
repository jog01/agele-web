// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { AuthContext, demoAuth } from "@/components/auth/auth-context";
import type { Token } from "@/lib/api/client";
import { OrderTicket } from "./order-ticket";

const queryState = vi.hoisted(() => ({ error: null as Error | null }));

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: () => ({ data: undefined, error: queryState.error }),
}));
vi.mock("@/hooks/use-market-data-source", () => ({
  useMarketDataMode: () => ({ demoMode: true }),
}));

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

afterEach(() => {
  cleanup();
  localStorage.clear();
  queryState.error = null;
});

function openSettings() {
  fireEvent.click(screen.getByRole("button", { name: "Trade settings" }));
}

function setPreset(label: string, value: string) {
  fireEvent.change(screen.getByRole("textbox", { name: label }), { target: { value } });
}

function saveSettings() {
  fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
}

it("validates and persists edited presets across tickets without enabling unavailable sells", () => {
  const first = render(createElement(OrderTicket, { token, price: 150 }));
  openSettings();
  setPreset("Buy preset 1", "0.0000001");
  setPreset("Sell preset 1", "101");
  saveSettings();
  expect(screen.getByText(/at most 6 decimal places/)).toBeDefined();
  expect(screen.getByText(/from 1 to 100/)).toBeDefined();
  setPreset("Buy preset 1", "12.500000");
  setPreset("Sell preset 1", "33");
  saveSettings();
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "$12.5" }));
  expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("12.5");
  expect(screen.queryByRole("dialog")).toBeNull();
  first.unmount();
  render(createElement(OrderTicket, { token, price: 150, initialSide: "sell" }));
  expect((screen.getByRole("button", { name: "33%" }) as HTMLButtonElement).disabled).toBe(true);
  openSettings();
  expect((screen.getByRole("textbox", { name: "Buy preset 1" }) as HTMLInputElement).value).toBe("12.5");
});

it("previews an opted-in demo preset without enabling submission or remembering the opt-in", () => {
  const first = render(createElement(OrderTicket, { token, price: 150 }));
  openSettings();
  fireEvent.click(screen.getByRole("checkbox", { name: "Instant buy" }));
  saveSettings();
  fireEvent.click(screen.getByRole("button", { name: "Preview SOL with $10" }));
  expect(screen.getByRole("dialog", { name: "Review buy SOL" })).toBeDefined();
  expect((screen.getByRole("button", { name: "Confirm buy SOL" }) as HTMLButtonElement).disabled).toBe(true);
  first.unmount();
  render(createElement(OrderTicket, { token, price: 150 }));
  expect(screen.queryByRole("button", { name: "Preview SOL with $10" })).toBeNull();
  expect(screen.getByRole("button", { name: "$10" })).toBeDefined();
});

it("does not carry demo preview consent into a connected wallet", () => {
  const signSwap = vi.fn();
  const ticket = (auth: typeof demoAuth) =>
    createElement(AuthContext, { value: auth }, createElement(OrderTicket, { token, price: 150 }));
  const { rerender } = render(ticket(demoAuth));
  openSettings();
  fireEvent.click(screen.getByRole("checkbox", { name: "Instant buy" }));
  saveSettings();
  rerender(ticket({ ...demoAuth, configured: true, authenticated: true, walletAddress: "wallet", signSwap }));
  expect(screen.queryByRole("button", { name: "Buy SOL with $10" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "$10" }));
  fireEvent.click(screen.getByRole("button", { name: "Review buy SOL" }));
  expect(screen.getByRole("dialog", { name: "Review buy SOL" })).toBeDefined();
  expect(signSwap).not.toHaveBeenCalled();
});

it("keeps demo disclosure subtle without repeating the sign-in configuration notice", () => {
  render(createElement(OrderTicket, { token, price: 150 }));
  expect(screen.getByText("Demo", { exact: true })).toBeDefined();
  expect(screen.queryByText("Demo market data", { exact: true })).toBeNull();
  expect(screen.queryByText(/Configure sign-in to trade/)).toBeNull();
  expect((screen.getByRole("button", { name: "Sign in to trade" }) as HTMLButtonElement).disabled).toBe(true);
});

it("still exposes quote errors without a configured sign-in provider", () => {
  queryState.error = new Error("Quote unavailable");
  render(createElement(OrderTicket, { token, price: 150 }));
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "10" } });
  expect(screen.getByRole("status").textContent).toContain("Quote unavailable");
});

it.each(["buy", "sell"] as const)("gates empty, oversized and valid %s previews", (side) => {
  render(
    createElement(
      AuthContext,
      { value: demoAuth },
      createElement(OrderTicket, {
        token,
        price: 150,
        initialSide: side,
      }),
    ),
  );
  const preview = screen.getByRole("button", { name: `Preview ${side} SOL` }) as HTMLButtonElement;
  const input = screen.getByRole("textbox");
  expect(preview.disabled).toBe(true);
  fireEvent.change(input, { target: { value: "9".repeat(80) } });
  expect(preview.disabled).toBe(true);
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(screen.getAllByText(/Amount is too large/)).toHaveLength(1);
  expect(input.getAttribute("aria-describedby")).toContain(screen.getByText(/Amount is too large/).id);
  fireEvent.submit(input.closest("form")!);
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.change(input, { target: { value: "10" } });
  expect(preview.disabled).toBe(false);
  expect(input.getAttribute("aria-invalid")).toBe("false");
});

it.each(["buy", "sell"] as const)(
  "preserves invalid typed %s amounts instead of reinterpreting them",
  (side) => {
    render(
      createElement(
        AuthContext,
        { value: demoAuth },
        createElement(OrderTicket, { token, price: 150, initialSide: side }),
      ),
    );
    const preview = screen.getByRole("button", { name: `Preview ${side} SOL` }) as HTMLButtonElement;
    const input = screen.getByRole("textbox") as HTMLInputElement;
    for (const value of ["-", "-5", "abc", "5abc", "1.2.3"]) {
      fireEvent.change(input, { target: { value } });
      expect(input.value).toBe(value);
      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(screen.getAllByText("Enter a valid amount")).toHaveLength(1);
      expect(input.getAttribute("aria-describedby")).toContain(screen.getByText("Enter a valid amount").id);
      expect(preview.disabled).toBe(true);
      fireEvent.submit(input.closest("form")!);
      expect(screen.queryByRole("dialog")).toBeNull();
    }
    fireEvent.change(input, { target: { value: "5" } });
    expect(preview.disabled).toBe(false);
    expect(input.getAttribute("aria-invalid")).toBe("false");
    fireEvent.change(input, { target: { value: "" } });
    expect(preview.disabled).toBe(true);
    expect(screen.queryByText("Enter a valid amount")).toBeNull();
  },
);
