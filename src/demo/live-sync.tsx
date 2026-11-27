"use client";
// Frontend-only demo: replaces components/live-sync.tsx (next.config.ts aliases it). There is no server to connect
// to; the demo store already re-renders every tab when anything changes, so the app is always "live".

import { LiveStatus, type LiveLabels } from "@/components/live-status";

/** Same event name as the real module: the bell listens for it (the demo just never fires it). */
export const LIVE_CHANGED_EVENT = "chalai:live-changed";

export function LiveSync({ labels, dark = false }: { labels: LiveLabels; dark?: boolean }) {
  return <LiveStatus status="live" labels={labels} dark={dark} />;
}
