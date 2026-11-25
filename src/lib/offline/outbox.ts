"use client";
// The outbox (pos-offline spec): every offline write is stored first, then replayed once, in order, through
// /api/outbox with its Idempotency-Key. A network failure stops the replay; a refusal (409 table_busy,
// item_unavailable…) marks that entry failed, and the entries of the same order wait behind it.

import { useSyncExternalStore } from "react";
import { addEntry, deleteEntry, deleteOrder, listEntries, listOrders, putEntry, saveSnapshot, type OutboxEntry } from "./store";

type State = { pending: number; failed: number; syncing: boolean; online: boolean };
let state: State = { pending: 0, failed: 0, syncing: false, online: true };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

async function recount() {
  const all = await listEntries();
  set({ pending: all.filter((e) => e.state === "pending").length, failed: all.filter((e) => e.state === "failed").length });
}

export async function enqueue(entry: Omit<OutboxEntry, "state" | "createdAt">) {
  await addEntry({ ...entry, state: "pending", createdAt: new Date().toISOString() });
  await recount();
  void flush();
}

let flushing: Promise<void> | null = null;

/** Replays the outbox. Safe to call any time; only one replay runs. */
export function flush(): Promise<void> {
  flushing ??= (async () => {
    set({ syncing: true });
    try {
      const blocked = new Set<string>();
      let uploaded = false;
      for (const entry of await listEntries()) {
        if (entry.state === "failed") {
          if (entry.orderId) blocked.add(entry.orderId);
          continue;
        }
        if (entry.orderId && blocked.has(entry.orderId)) continue;
        let response: Response;
        try {
          response = await fetch("/api/outbox", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: entry.path, body: entry.body, key: entry.key }),
          });
        } catch {
          set({ online: false });
          return; // still offline: try again later, in the same order
        }
        set({ online: true });
        if (response.status === 401) return; // signed out: keep everything for after login
        if (response.ok) {
          await deleteEntry(entry.seq!);
          uploaded = true;
        } else if (response.status >= 500) {
          return;
        } else {
          const body = (await response.json().catch(() => ({}))) as { code?: string };
          await putEntry({ ...entry, state: "failed", error: body.code ?? `http_${response.status}` });
          if (entry.orderId) blocked.add(entry.orderId);
        }
        await recount();
      }
      // Offline orders whose writes all went up are on the server now.
      const left = await listEntries();
      for (const o of await listOrders()) {
        if (o.closed && !left.some((e) => e.orderId === o.id)) await deleteOrder(o.id);
      }
      if (left.length === 0 && uploaded) await refreshSnapshot();
    } finally {
      await recount();
      set({ syncing: false });
      flushing = null;
    }
  })();
  return flushing;
}

/** Drops a refused entry and the rest of its order's entries (the cashier chose to discard them). */
export async function discard(orderId: string) {
  for (const e of await listEntries()) if (e.orderId === orderId) await deleteEntry(e.seq!);
  await deleteOrder(orderId);
  await recount();
}

/** Sends a refused entry again (e.g. after the cashier moved the order to a free table and edited it). */
export async function retry(entry: OutboxEntry, patch: Partial<OutboxEntry> = {}) {
  await putEntry({ ...entry, ...patch, state: "pending", error: undefined });
  await recount();
  void flush();
}

let probing: Promise<boolean> | null = null;
/**
 * Asks Chalai whether it can be reached. The browser's own online flag only knows about Wi-Fi: with the router up and
 * the internet down it still says online, so this is what notices the most common outage.
 */
export function probe(): Promise<boolean> {
  probing ??= (async () => {
    try {
      const response = await fetch("/api/ping", { cache: "no-store", signal: AbortSignal.timeout(8_000) });
      // Signed out still means reachable; only a gateway error or no answer means offline.
      const reachable = response.status < 500;
      set({ online: reachable });
      if (reachable) void flush();
      return reachable;
    } catch {
      set({ online: false });
      return false;
    } finally {
      probing = null;
    }
  })();
  return probing;
}

/** The live connection is back, so the server is reachable: clear "offline" now and replay anything queued. */
export function markOnline() {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  set({ online: true });
  void flush();
}

export async function refreshSnapshot(): Promise<boolean> {
  try {
    const response = await fetch("/api/offline/snapshot", { cache: "no-store" });
    if (!response.ok) return false;
    await saveSnapshot(await response.json());
    set({ online: true });
    return true;
  } catch {
    set({ online: false });
    return false;
  }
}

export function useOutbox(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

let started = false;
/** Starts the background work once per page: count, replay on reconnect and every 20 s, refresh the snapshot. */
export function startOffline() {
  if (started || typeof window === "undefined") return;
  started = true;
  set({ online: navigator.onLine });
  void recount().then(async () => {
    if (navigator.onLine) await probe();
    await flush();
    if (state.pending === 0 && navigator.onLine) await refreshSnapshot();
  });
  // Wi-Fi back doesn't mean the internet is: ask before saying online.
  window.addEventListener("online", () => void probe());
  window.addEventListener("offline", () => set({ online: false }));
  setInterval(() => void flush(), 20_000);
  // While offline, check every 15 s so the bar turns green soon after the internet returns.
  setInterval(() => void (!state.online && probe()), 15_000);
  setInterval(() => void (state.pending === 0 && navigator.onLine && refreshSnapshot()), 120_000);
}
