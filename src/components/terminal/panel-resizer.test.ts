// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { PanelResizer } from "./panel-resizer";
import { clamp, DEFAULT_LAYOUT, parseLayout } from "./use-panel-layout";

afterEach(cleanup);

it("sanitizes saved dimensions and malformed storage", () => {
  expect(parseLayout(null)).toEqual(DEFAULT_LAYOUT);
  expect(parseLayout("{broken")).toEqual(DEFAULT_LAYOUT);
  expect(parseLayout('{"markets":9999,"ticket":-1,"chart":"bad","order":0.4}')).toEqual({
    markets: 380,
    ticket: 260,
    chart: DEFAULT_LAYOUT.chart,
    order: 0.4,
  });
  expect(clamp(600, 220, 400)).toBe(400);
  expect(clamp(100, 220, 100)).toBe(220);
  expect(parseLayout('{"chart":-2,"order":2}')).toMatchObject({ chart: 0, order: 1 });
});

it.each([480, 960, 2400])("round-trips height limits for a %ipx panel", (height) => {
  const space = height - 6;
  for (const pixels of [220, height - 166]) {
    const chart = pixels / space;
    expect(parseLayout(JSON.stringify({ chart })).chart).toBe(chart);
  }
  for (const pixels of [230, height - 106]) {
    const order = pixels / space;
    expect(parseLayout(JSON.stringify({ order })).order).toBe(order);
  }
});

it("exposes a named, bounded keyboard-operable window splitter", () => {
  const onChange = vi.fn();
  const onReset = vi.fn();
  render(
    createElement(PanelResizer, {
      label: "Resize markets",
      controls: "markets",
      value: 248,
      min: 200,
      max: 380,
      onChange,
      onReset,
    }),
  );
  const handle = screen.getByRole("separator", { name: "Resize markets" });
  expect(handle.getAttribute("aria-controls")).toBe("markets");
  expect(handle.getAttribute("aria-valuenow")).toBe("248");
  expect(handle.classList.contains("h-full")).toBe(true);
  fireEvent.keyDown(handle, { key: "ArrowRight" });
  expect(onChange).toHaveBeenLastCalledWith(258);
  fireEvent.keyDown(handle, { key: "ArrowLeft", shiftKey: true });
  expect(onChange).toHaveBeenLastCalledWith(208);
  fireEvent.keyDown(handle, { key: "Home" });
  expect(onChange).toHaveBeenLastCalledWith(200);
  fireEvent.keyDown(handle, { key: "End" });
  expect(onChange).toHaveBeenLastCalledWith(380);
  fireEvent.keyDown(handle, { key: "Enter" });
  fireEvent.doubleClick(handle);
  expect(onReset).toHaveBeenCalledTimes(2);
});

it("reverses right-rail movement and supports vertical stacking", () => {
  const onChange = vi.fn();
  const props = {
    label: "Rail",
    controls: "rail",
    value: 300,
    min: 260,
    max: 440,
    onChange,
    onReset: vi.fn(),
    reverse: true,
  };
  const { rerender } = render(createElement(PanelResizer, props));
  fireEvent.keyDown(screen.getByRole("separator"), { key: "ArrowLeft" });
  expect(onChange).toHaveBeenLastCalledWith(310);
  rerender(createElement(PanelResizer, { ...props, orientation: "horizontal", reverse: false }));
  const handle = screen.getByRole("separator");
  expect(handle.getAttribute("aria-orientation")).toBe("horizontal");
  fireEvent.keyDown(handle, { key: "ArrowDown", shiftKey: true });
  expect(onChange).toHaveBeenLastCalledWith(340);
});
