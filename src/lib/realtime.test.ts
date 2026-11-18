import { describe, expect, it } from "vitest";
import { resolveWsUrl } from "./realtime";

describe("resolveWsUrl", () => {
  it("passes absolute URLs through", () => {
    expect(resolveWsUrl("ws://localhost:4000/ws", { protocol: "https:", host: "app.test" })).toBe(
      "ws://localhost:4000/ws",
    );
  });

  it("resolves same-origin paths against the page", () => {
    expect(resolveWsUrl("/__devin/port/4000/ws", { protocol: "https:", host: "app.test" })).toBe(
      "wss://app.test/__devin/port/4000/ws",
    );
    expect(resolveWsUrl("/ws", { protocol: "http:", host: "localhost:3000" })).toBe("ws://localhost:3000/ws");
  });
});
