import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({ env: { NEXT_PUBLIC_WS_URL: "ws://localhost:4000/ws" } }));
vi.mock("@/stores/realtime", () => ({
  useRealtimeStore: { getState: () => ({ setStatus: vi.fn(), touch: vi.fn() }) },
}));

class FakeWebSocket {
  static OPEN = 1;
  static instances: FakeWebSocket[] = [];
  readyState = 0;
  onopen = () => {};
  onclose = () => {};
  onmessage = (_event: { data: string }) => {};
  send = vi.fn();
  constructor() {
    FakeWebSocket.instances.push(this);
  }
  open() {
    this.readyState = 1;
    this.onopen();
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("multiplexed realtime subscriptions", () => {
  it("deduplicates many mints and consumers, re-subscribes once per topic, and cleans up", async () => {
    vi.resetModules();
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    vi.stubGlobal("window", {});
    vi.stubGlobal("WebSocket", FakeWebSocket);
    const { realtime } = await import("@/lib/realtime");
    const listener = vi.fn();
    const topics = Array.from({ length: 50 }, (_, i) => `token:mint-${i}:price`);
    const off = topics.map((topic) => realtime.subscribe(topic, listener));
    const second = vi.fn();
    const offSecond = realtime.subscribe(topics[0], second);
    const ws = FakeWebSocket.instances[0];
    expect(FakeWebSocket.instances).toHaveLength(1);
    ws.open();
    expect(ws.send).toHaveBeenCalledTimes(50);
    const data = { priceUsd: 3 };
    ws.onmessage({ data: JSON.stringify({ type: "event", topic: topics[0], data }) });
    expect(listener).toHaveBeenCalledWith(data);
    expect(second).toHaveBeenCalledWith(data);
    const onReconnect = vi.fn();
    const offReconnect = realtime.onReconnect(onReconnect);
    ws.onclose();
    await vi.advanceTimersByTimeAsync(500);
    const reconnected = FakeWebSocket.instances[1];
    reconnected.open();
    expect(reconnected.send).toHaveBeenCalledTimes(50);
    expect(onReconnect).toHaveBeenCalledTimes(1);
    off[0]();
    expect(reconnected.send).toHaveBeenCalledTimes(50);
    offSecond();
    expect(reconnected.send).toHaveBeenLastCalledWith(
      JSON.stringify({ op: "unsubscribe", topic: topics[0] }),
    );
    for (const unsubscribe of off.slice(1)) unsubscribe();
    offReconnect();
  });
});
