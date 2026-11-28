// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { search } from "@/lib/api/search";
import { useSearch } from "./use-search";

vi.mock("@/lib/api/search", () => ({ search: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.resetAllMocks();
});

it("debounces trimmed input, skips closed and blank queries, and aborts superseded lookups", async () => {
  vi.useFakeTimers();
  vi.mocked(search).mockImplementation(() => new Promise(() => {}));
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
  const { result, rerender } = renderHook(({ value, open }) => useSearch(value, open), {
    initialProps: { value: "skip", open: false },
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children),
  });
  const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

  await tick(250);
  rerender({ value: "  ", open: true });
  await tick(250);
  expect(result.current.isPending).toBe(false);
  expect(search).not.toHaveBeenCalled();

  rerender({ value: "s", open: true });
  await tick(150);
  rerender({ value: " so ", open: true });
  await tick(249);
  expect(result.current.isPending).toBe(true);
  expect(search).not.toHaveBeenCalled();
  await tick(1);
  expect(search).toHaveBeenCalledExactlyOnceWith("so", expect.any(AbortSignal));
  const signal = vi.mocked(search).mock.calls[0][1];

  rerender({ value: "sol", open: true });
  expect(signal.aborted).toBe(true);
  await tick(250);
  expect(search).toHaveBeenLastCalledWith("sol", expect.any(AbortSignal));
});
