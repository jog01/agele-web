// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MarketExplorer } from "./market-explorer";

const { useMintSearch, useTrending } = vi.hoisted(() => ({
  useTrending: vi.fn(),
  useMintSearch: vi.fn(() => ({})),
}));
vi.mock("@/lib/api/queries", () => ({ useTrending }));
vi.mock("@/hooks/use-mint-search", () => ({ useMintSearch }));
afterEach(cleanup);

describe("MarketExplorer hydration", () => {
  it("keeps the server skeleton until mounted when the ticker already filled the cache", async () => {
    useTrending.mockReturnValue({ data: undefined, isPending: true, isError: false });
    const element = createElement(MarketExplorer, { activeMint: "sol-mint" });
    const serverHtml = renderToString(element);
    useTrending.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        {
          mint: "sol-mint",
          symbol: "SOL",
          name: "Solana",
          priceUsd: 100,
          priceChange24hPct: 2,
          marketCapUsd: 1000,
          holders: 10,
        },
      ],
    });
    expect(renderToString(element)).toBe(serverHtml);

    const container = document.createElement("div");
    container.innerHTML = serverHtml;
    document.body.append(container);
    const onRecoverableError = vi.fn();
    render(element, { container, hydrate: true, onRecoverableError });
    expect(await screen.findByRole("link", { name: /SOL/ })).toBeTruthy();
    expect(onRecoverableError).not.toHaveBeenCalled();
  });

  it("keeps the change icon inline beside its percentage on the second price row", async () => {
    useTrending.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        {
          mint: "sol-mint",
          symbol: "SOL",
          name: "Solana",
          priceUsd: 100,
          priceChange24hPct: 2,
          marketCapUsd: 1000,
          holders: 10,
        },
      ],
    });
    render(createElement(MarketExplorer, { activeMint: "sol-mint" }));

    const change = await screen.findByText("+2.00%");
    expect(change.querySelector("svg")).not.toBeNull();
    expect(change.classList.contains("inline-flex")).toBe(true);
    expect(change.classList.contains("block")).toBe(false);
    expect(change.parentElement?.classList.contains("flex-col")).toBe(true);
  });
});
