"use client";

import { useEffect, useState } from "react";

/** Re-render about every 30s so seated timers update without per-second work. */
export function useElapsedTick(ms = 30_000): number {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return nowMs;
}