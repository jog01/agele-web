// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { AuthContext, demoAuth } from "@/components/auth/auth-context";
import type { Token } from "@/lib/api/client";
import { OrderTicket } from "./order-ticket";

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
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
      expect(screen.getAllByText("Enter a valid amount").length).toBeGreaterThan(0);
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
