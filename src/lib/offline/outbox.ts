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
    await flush();
    if (state.pending === 0 && navigator.onLine) await refreshSnapshot();
  });
  window.addEventListener("online", () => {
    set({ online: true });
    void flush();
  });
  window.addEventListener("offline", () => set({ online: false }));
  setInterval(() => void flush(), 20_000);
  setInterval(() => void (state.pending === 0 && navigator.onLine && refreshSnapshot()), 120_000);
}
