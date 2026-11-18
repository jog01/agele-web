// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it } from "vitest";
import { ChartSkeleton, OrderSkeleton, TableSkeleton } from "./panel-skeleton";

afterEach(cleanup);
it("announces loading and reserves a structured table without invented numbers", () => {
  const { container } = render(createElement(TableSkeleton, { label: "Loading holders", columns: 5 }));
  expect(screen.getByRole("status", { name: "Loading holders" })).toBeDefined();
  expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(35);
  expect(container.textContent).toBe("Loading holders");
});
it("provides chart and order loading states with reduced-motion support", () => {
  const { container } = render(
    createElement("div", null, createElement(ChartSkeleton), createElement(OrderSkeleton)),
  );
  expect(screen.getByRole("status", { name: "Loading chart" })).toBeDefined();
  expect(screen.getByRole("status", { name: "Loading order ticket" })).toBeDefined();
  for (const skeleton of container.querySelectorAll('[data-slot="skeleton"]'))
    expect(skeleton.className).toContain("motion-reduce:animate-none");
});
