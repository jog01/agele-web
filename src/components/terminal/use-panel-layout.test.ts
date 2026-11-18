// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { usePanelSize } from "./use-panel-layout";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Panel({ error }: { error: boolean }) {
  const size = usePanelSize();
  return error
    ? createElement("p", null, "API unavailable")
    : createElement("div", { ref: size.ref, "data-testid": "panel" }, size.height);
}

it("observes replacement panels after an API error and recovery", () => {
  const observers: {
    notify: (height: number) => void;
    observe: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }[] = [];
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      disconnect = vi.fn();
      constructor(callback: ResizeObserverCallback) {
        observers.push({
          notify: (height) =>
            callback(
              [{ contentRect: { width: 900, height } } as ResizeObserverEntry],
              this as unknown as ResizeObserver,
            ),
          observe: this.observe,
          disconnect: this.disconnect,
        });
      }
    },
  );
  const { rerender } = render(createElement(Panel, { error: true }));
  expect(observers).toHaveLength(0);
  rerender(createElement(Panel, { error: false }));
  expect(observers).toHaveLength(1);
  expect(observers[0].observe).toHaveBeenCalledWith(screen.getByTestId("panel"));
  act(() => observers[0].notify(600));
  expect(screen.getByTestId("panel").textContent).toBe("600");
  rerender(createElement(Panel, { error: true }));
  expect(observers[0].disconnect).toHaveBeenCalledOnce();
  rerender(createElement(Panel, { error: false }));
  expect(observers).toHaveLength(2);
  expect(observers[1].observe).toHaveBeenCalledWith(screen.getByTestId("panel"));
  act(() => observers[1].notify(960));
  expect(screen.getByTestId("panel").textContent).toBe("960");
});
