// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement, useState } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { TerminalRoute } from "./terminal-route";

const route = vi.hoisted(() => ({ mint: "mint-a" }));
vi.mock("next/navigation", () => ({ useParams: () => route }));
vi.mock("./terminal", () => ({
  Terminal: function Workspace({ mint }: { mint: string }) {
    const [size, setSize] = useState(248);
    return createElement(
      "button",
      { type: "button", "data-mint": mint, onClick: () => setSize(300) },
      `Markets width ${size}`,
    );
  },
}));

afterEach(() => {
  cleanup();
  route.mint = "mint-a";
});

it("server-renders the complete skeleton before hydrating the client workspace", () => {
  const html = renderToString(createElement(TerminalRoute));
  expect(html).toContain('aria-label="Loading trading workspace"');
  expect(html).toContain('data-slot="skeleton"');
  expect(html).not.toContain("Markets width");
  expect(html).not.toContain("Loading terminal…");
});

it("updates the mint without remounting the terminal or resetting local workspace state", () => {
  const { rerender } = render(createElement(TerminalRoute));
  const workspace = screen.getByRole("button");
  fireEvent.click(workspace);
  route.mint = "mint-b";
  rerender(createElement(TerminalRoute));
  expect(screen.getByRole("button")).toBe(workspace);
  expect(workspace.dataset.mint).toBe("mint-b");
  expect(workspace.textContent).toBe("Markets width 300");
  route.mint = "mint-a";
  rerender(createElement(TerminalRoute));
  expect(workspace.dataset.mint).toBe("mint-a");
  expect(workspace.textContent).toBe("Markets width 300");
});
