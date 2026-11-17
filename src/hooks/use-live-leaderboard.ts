"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { leaderboardSignalSchema } from "@/lib/api/live-data";
import { realtime } from "@/lib/realtime";

export function useLiveLeaderboard() {
  const qc = useQueryClient();
  useEffect(() => {
    const off = realtime.subscribe("leaderboard:global", (data) => {
      const parsed = leaderboardSignalSchema.safeParse(data);
      if (!parsed.success) return;
      void qc.invalidateQueries({ queryKey: ["leaderboard", parsed.data.window] });
    });
    const offReconnect = realtime.onReconnect(() => {
      void qc.invalidateQueries({ queryKey: ["leaderboard"] });
    });
    return () => {
      off();
      offReconnect();
    };
  }, [qc]);
}
