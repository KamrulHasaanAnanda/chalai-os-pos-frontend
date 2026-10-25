"use client";
// Client component: a live timer that ticks every second (time since an order opened).

import { useNow } from "@/lib/clock";
import { formatElapsed } from "@/lib/format";

export function Elapsed({ since, className }: { since: string; className?: string }) {
  const now = useNow();
  return (
    <time dateTime={since} className={className}>
      {now === null ? "–" : formatElapsed(now - new Date(since).getTime())}
    </time>
  );
}
