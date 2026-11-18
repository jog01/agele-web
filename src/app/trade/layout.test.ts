// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import TradeLayout from "./layout";

const route = vi.hoisted(() => ({ pending: true, ready: new Promise<never>(() => {}) }));
vi.mock("@/components/shell/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => createElement("main", null, children),
}));
vi.mock("@/components/terminal/terminal-route", () => ({
  TerminalRoute: () => {
    if (route.pending) throw route.ready;
    return createElement("section", { "aria-label": "Trading workspace" });
  },
}));

afterEach(() => {
  cleanup();
  route.pending = true;
});

it("wires the full workspace skeleton to initial route-parameter suspension", () => {
  render(createElement(TradeLayout, null, null));
  expect(screen.getByRole("status", { name: "Loading trading workspace" })).toBeDefined();
  expect(screen.queryByText("Loading terminal…")).toBeNull();
});

it("shows the terminal and route content once parameters are ready", () => {
  route.pending = false;
  render(createElement(TradeLayout, null, createElement("p", null, "Route content")));
  expect(screen.getByRole("region", { name: "Trading workspace" })).toBeDefined();
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.getByText("Route content")).toBeDefined();
});
