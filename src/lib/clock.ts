import { useSyncExternalStore } from "react";

/** One shared one-second ticker for every timer on the page. */
let now = Date.now();
const listeners = new Set<() => void>();
let interval: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!interval) {
    now = Date.now();
    interval = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
    queueMicrotask(() => listeners.forEach((l) => l()));
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(interval);
      interval = undefined;
    }
  };
}

/** The current time, updated every second. Null on the server (and during hydration), so markup always matches. */
export function useNow(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => now,
    () => null,
  );
}
