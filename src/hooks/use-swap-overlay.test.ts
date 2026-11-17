// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ISeriesApi } from "lightweight-charts";
import { afterEach, expect, it, vi } from "vitest";
import { useSwapOverlay } from "./use-swap-overlay";

const mocks = vi.hoisted(() => ({ history: vi.fn(), markers: vi.fn(), detach: vi.fn() }));
vi.mock("lightweight-charts", () => ({ createSeriesMarkers: mocks.markers }));
vi.mock("./use-swap-history", () => ({ useSwapHistory: mocks.history }));
const candle = { current: {} as ISeriesApi<"Candlestick"> };
const line = { current: {} as ISeriesApi<"Line"> };
const bars = [{ time: 1767225600, open: 1, high: 2, low: 1, close: 2, volume: 3 }];
const item = {
  requestId: "one",
  status: "confirmed",
  inputMint: "usdc",
  outputMint: "token",
  inAmount: "1",
  outAmount: "1",
  createdAt: "2026-01-01T00:00:00Z",
};
function history(authenticated = true, isError = false) {
  mocks.history.mockReturnValue({ authenticated, isError, isPending: false, items: [item] });
  mocks.markers.mockReturnValue({ detach: mocks.detach });
}
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("attaches confirmed markers on toggle, switches chart style, and cleans up on logout", () => {
  history();
  const { result, rerender } = renderHook(
    ({ style }: { style: "candles" | "line" }) => useSwapOverlay("token", false, candle, line, style, bars),
    { initialProps: { style: "candles" } },
  );
  act(() => result.current.toggle());
  expect(mocks.markers).toHaveBeenLastCalledWith(candle.current, [expect.objectContaining({ text: "Buy" })]);
  rerender({ style: "line" });
  expect(mocks.detach).toHaveBeenCalled();
  expect(mocks.markers).toHaveBeenLastCalledWith(line.current, [expect.objectContaining({ text: "Buy" })]);
  history(false);
  rerender({ style: "line" });
  expect(result.current.disabled).toBe(true);
  expect(mocks.markers).toHaveBeenLastCalledWith(line.current, []);
});

it("keeps demo overlays disabled and clears markers on history errors", () => {
  history();
  const demo = renderHook(() => useSwapOverlay("token", true, candle, line, "candles", bars));
  expect(demo.result.current.disabled).toBe(true);
  expect(demo.result.current.title).toContain("Sign in");
  history(true, true);
  const failed = renderHook(() => useSwapOverlay("token", false, candle, line, "candles", bars));
  act(() => failed.result.current.toggle());
  expect(failed.result.current.label).toContain("unavailable");
  expect(mocks.markers).toHaveBeenLastCalledWith(candle.current, []);
});
