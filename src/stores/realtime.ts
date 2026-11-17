"use client";

import { create } from "zustand";

export type ConnectionStatus = "connecting" | "open" | "closed";

interface RealtimeState {
  status: ConnectionStatus;
  lastMessageAt: number | null;
  setStatus: (status: ConnectionStatus) => void;
  touch: () => void;
}

export const useRealtimeStore = create<RealtimeState>()((set) => ({
  status: "connecting",
  lastMessageAt: null,
  setStatus: (status) => set({ status }),
  touch: () => set({ lastMessageAt: Date.now() }),
}));
