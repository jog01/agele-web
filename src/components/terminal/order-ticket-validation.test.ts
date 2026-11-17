// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { AuthContext, demoAuth } from "@/components/auth/auth-context";
import type { Token } from "@/lib/api/client";
import { OrderTicket } from "./order-ticket";

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: undefined, error: null }),
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

afterEach(cleanup);

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
  expect(screen.getAllByText(/Amount is too large/).length).toBeGreaterThan(0);
  fireEvent.submit(input.closest("form")!);
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.change(input, { target: { value: "10" } });
  expect(preview.disabled).toBe(false);
  expect(input.getAttribute("aria-invalid")).toBe("false");
});
