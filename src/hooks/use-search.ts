"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { search } from "@/lib/api/search";

export function useSearch(input: string, open: boolean) {
  const query = input.trim();
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    if (!open || !query) return;
    const timer = window.setTimeout(() => setDebounced(query), 250);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  const enabled = open && query.length > 0;
  const ready = enabled && query === debounced;
  const result = useQuery({
    queryKey: ["search", query],
    queryFn: ({ signal }) => search(query, signal),
    enabled: ready,
    staleTime: 30_000,
    retry: false,
  });

  return {
    data: enabled ? result.data : undefined,
    isPending: enabled && (!ready || result.isPending) && !result.data,
    isError: ready && result.isError && !result.data,
  };
}
