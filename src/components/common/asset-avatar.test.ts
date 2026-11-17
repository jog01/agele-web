// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssetAvatar } from "./asset-avatar";

vi.mock("next/image", () => ({
  default: ({ sizes: _sizes, ...props }: Record<string, unknown>) => createElement("img", props),
}));
afterEach(cleanup);
const mint = "So11111111111111111111111111111111111111112";
describe("AssetAvatar", () => {
  it("uses the mint-matched local image with reserved dimensions", () => {
    const { container } = render(createElement(AssetAvatar, { mint, symbol: "SOL" }));
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/tokens/sol.webp");
    expect(img?.getAttribute("width")).toBe("48");
    expect(img?.getAttribute("height")).toBe("48");
  });
  it("falls back after an image error and recovers when the mint changes", () => {
    const { container, rerender } = render(createElement(AssetAvatar, { mint, symbol: "SOL" }));
    fireEvent.error(container.querySelector("img")!);
    expect(container.textContent).toBe("SO");
    expect(container.querySelector("img")).toBeNull();
    rerender(
      createElement(AssetAvatar, { mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", symbol: "JUP" }),
    );
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/tokens/jup.webp");
  });
  it("keeps an unknown token on the initials fallback", () => {
    const { container } = render(createElement(AssetAvatar, { mint: "unknown", symbol: "SOL" }));
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toBe("SO");
  });
});
