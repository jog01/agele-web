// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import type { Token } from "@/lib/api/client";
import { tokenQueries } from "@/lib/api/queries";
import { AssetAvatar } from "./asset-avatar";
import { TokenAssetAvatar } from "./token-asset-avatar";

afterEach(cleanup);
const mint = "So11111111111111111111111111111111111111112";
const logo = "https://example.com/sol.webp";
const token: Token = {
  mint,
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
describe("AssetAvatar", () => {
  it("uses the API image with reserved dimensions and no referrer", () => {
    const { container } = render(createElement(AssetAvatar, { imageUrl: logo }));
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe(logo);
    expect(img?.getAttribute("width")).toBe("48");
    expect(img?.getAttribute("height")).toBe("48");
    expect(img?.getAttribute("referrerpolicy")).toBe("no-referrer");
  });
  it("shows the glyph after a load error and recovers when the URL changes", () => {
    const { container, rerender } = render(createElement(AssetAvatar, { imageUrl: logo }));
    fireEvent.error(container.querySelector("img")!);
    expect(container.textContent).toBe("");
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
    rerender(createElement(AssetAvatar, { imageUrl: "https://example.com/jup.webp" }));
    expect(container.querySelector("img")?.getAttribute("src")).toBe("https://example.com/jup.webp");
  });
  it.each([undefined, "/tokens/sol.webp", "data:image/svg+xml,invalid"])(
    "shows a glyph and never initials without a usable remote logo (%s)",
    (imageUrl) => {
      const { container } = render(createElement(AssetAvatar, { imageUrl }));
      expect(container.querySelector("img")).toBeNull();
      expect(container.querySelector("svg")).not.toBeNull();
      expect(container.textContent).toBe("");
    },
  );
});

describe("TokenAssetAvatar", () => {
  it.each([
    [logo, "https://example.com/trending.webp", logo],
    [null, logo, logo],
    [null, null, null],
  ])("prioritizes cached detail (%s) over trending (%s)", (detail, trending, expected) => {
    const client = new QueryClient();
    client.setQueryData(tokenQueries.detail(mint).queryKey, { ...token, imageUrl: detail });
    client.setQueryData(tokenQueries.trending().queryKey, [{ ...token, imageUrl: trending }]);
    const { container, unmount } = render(
      createElement(QueryClientProvider, { client }, createElement(TokenAssetAvatar, { mint })),
    );
    expect(container.querySelector("img")?.getAttribute("src") ?? null).toBe(expected);
    expect(container.textContent).toBe("");
    unmount();
    client.clear();
  });
});
