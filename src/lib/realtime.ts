"use client";

import { env } from "@/env";
import { useRealtimeStore } from "@/stores/realtime";

type Listener = (data: unknown) => void;

/**
 * Single multiplexed WebSocket for the app. Topics mirror the API (`token:<mint>:trades`, ...).
 * Reconnects with backoff and re-subscribes; callers should re-snapshot over REST after a reconnect.
 */
class RealtimeClient {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<Listener>>();
  private reconnectListeners = new Set<() => void>();
  private retry = 0;
  private everOpened = false;

  connect() {
    if (typeof window === "undefined" || this.ws) return;
    const store = useRealtimeStore.getState();
    store.setStatus("connecting");
    const ws = new WebSocket(env.NEXT_PUBLIC_WS_URL);
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      useRealtimeStore.getState().setStatus("open");
      for (const topic of this.listeners.keys()) this.send({ op: "subscribe", topic });
      if (this.everOpened) for (const cb of this.reconnectListeners) cb();
      this.everOpened = true;
    };
    ws.onmessage = (ev) => {
      useRealtimeStore.getState().touch();
      try {
        const msg = JSON.parse(String(ev.data)) as { type: string; topic?: string; data?: unknown };
        if (msg.type !== "event" || !msg.topic) return;
        for (const cb of this.listeners.get(msg.topic) ?? []) cb(msg.data);
      } catch {
        // ignore malformed frames
      }
    };
    ws.onclose = () => {
      this.ws = null;
      useRealtimeStore.getState().setStatus("closed");
      const delay = Math.min(30_000, 500 * 2 ** this.retry++);
      setTimeout(() => this.connect(), delay);
    };
  }

  subscribe(topic: string, cb: Listener) {
    this.connect();
    let set = this.listeners.get(topic);
    if (!set) {
      set = new Set();
      this.listeners.set(topic, set);
      this.send({ op: "subscribe", topic });
    }
    set.add(cb);
    return () => {
      set.delete(cb);
      if (set.size === 0) {
        this.listeners.delete(topic);
        this.send({ op: "unsubscribe", topic });
      }
    };
  }

  onReconnect(cb: () => void) {
    this.reconnectListeners.add(cb);
    return () => this.reconnectListeners.delete(cb);
  }

  private send(msg: object) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }
}

export const realtime = new RealtimeClient();
