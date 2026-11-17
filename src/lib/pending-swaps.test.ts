// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { pendingSwaps } from "./pending-swaps";

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.restoreAllMocks());

it("returns a stable empty snapshot without a stored request", () => {
  expect(pendingSwaps.snapshot("empty").pending).toBeUndefined();
  expect(pendingSwaps.snapshot("empty")).toBe(pendingSwaps.snapshot("empty"));
});

it("persists only tracking metadata and isolates wallet keys", () => {
  pendingSwaps.track("wallet-a", { requestId: "one", signature: "sig" });
  expect(JSON.parse(sessionStorage.getItem("wallet-a")!)).toEqual({ requestId: "one", signature: "sig" });
  expect(pendingSwaps.snapshot("wallet-b").pending).toBeUndefined();
  pendingSwaps.track("wallet-a", undefined);
  expect(sessionStorage.getItem("wallet-a")).toBeNull();
});

it.each(["not-json", "{}", '{"requestId":""}', '{"requestId":"one","signature":4}'])(
  "fails closed for corrupt storage %s",
  (raw) => {
    sessionStorage.setItem("corrupt", raw);
    expect(pendingSwaps.snapshot("corrupt").storageError).toContain("Trading is blocked");
    expect(pendingSwaps.begin("corrupt")).toBe(false);
  },
);

it("fails closed when storage is inaccessible", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("Denied");
  });
  expect(pendingSwaps.snapshot("denied").storageError).toContain("Trading is blocked");
  expect(pendingSwaps.begin("denied")).toBe(false);
});
