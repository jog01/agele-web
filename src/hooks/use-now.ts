"use client";

import { useEffect, useState } from "react";

/** Current time, ticking every `ms`. Null until mounted so prerendered HTML never bakes in a timestamp. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
