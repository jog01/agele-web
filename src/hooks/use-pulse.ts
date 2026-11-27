"use client";

import { focusManager, queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { ApiError } from "@/lib/api/client";
import { fetchPulse, mergePulseEvent, PULSE_LIMIT, pulseEventSchema } from "@/lib/api/pulse";
import { realtime } from "@/lib/realtime";

const pulseQuery = queryOptions({
  queryKey: ["pulse", PULSE_LIMIT],
  queryFn: ({ signal }) => fetchPulse(signal),
  retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
});

export function usePulse() {
  const queryClient = useQueryClient();
  const query = useQuery(pulseQuery);

  useEffect(() => {
    const queryKey = pulseQuery.queryKey;
    const refresh = () =>
      void queryClient.invalidateQueries({ queryKey, exact: true }, { cancelRefetch: false });
    const interval = window.setInterval(() => {
      if (focusManager.isFocused()) refresh();
    }, 15_000);
    const unsubscribe = realtime.subscribe("pulse", (data) => {
      const event = pulseEventSchema.safeParse(data);
      if (!event.success) return;
      const current = queryClient.getQueryData(queryKey);
      const next = current ? mergePulseEvent(current, event.data) : null;
      if (next) queryClient.setQueryData(queryKey, next);
      else refresh();
    });
    const unsubscribeReconnect = realtime.onReconnect(refresh);
    return () => {
      window.clearInterval(interval);
      unsubscribe();
      unsubscribeReconnect();
    };
  }, [queryClient]);

  return query;
}
