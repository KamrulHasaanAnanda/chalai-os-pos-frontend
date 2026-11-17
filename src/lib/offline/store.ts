"use client";
// The till's offline store (pos-offline spec), in IndexedDB: the last snapshot from the server, the outbox of writes
// made while offline, and the orders this device opened offline. No library: three small object stores.

import type { Floor, MenuCategory, Me, Order } from "@/lib/api/types";

export type Snapshot = {
  savedAt: string;
  me: Me;
  floor: Floor;
  menu: MenuCategory[];
  orders: Order[];
  sync: { menuVersion: string; floorVersion: string } | null;
};

export type OutboxEntry = {
  seq?: number;
  key: string;
  path: string;
  body: unknown;
  /** Which offline order it belongs to, so a refused entry can be shown on it. */
  orderId: string | null;
  label: string;
  createdAt: string;
  state: "pending" | "failed";
  error?: string;
};

export type LocalOrder = {
  id: string;
  tableId: string;
  tableLabel: string;
  /** Opened on this device while offline (false: an order the server already had). */
  openedHere: boolean;
  number: number | null;
  openedAt: string;
  lines: { menuItemId: string; name: string; unitPricePaisa: number; quantity: number }[];
  /** Already on the server bill before going offline. */
  serverPaidPaisa: number;
  serverLines: { name: string; unitPricePaisa: number; quantity: number }[];
  payments: { method: string; amountPaisa: number; tenderedPaisa: number | null; reference: string | null }[];
  closed: boolean;
};

const DB = "chalai-pos-offline";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore("kv");
      db.createObjectStore("outbox", { keyPath: "seq", autoIncrement: true });
      db.createObjectStore("orders", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = run(t.objectStore(store));
    t.oncomplete = () => resolve(req ? req.result : undefined);
    t.onerror = () => reject(t.error);
  });
}

export const saveSnapshot = (s: Snapshot) => tx("kv", "readwrite", (st) => st.put(s, "snapshot"));
export const loadSnapshot = () => tx<Snapshot | undefined>("kv", "readonly", (st) => st.get("snapshot") as IDBRequest<Snapshot | undefined>);

export const addEntry = (e: OutboxEntry) => tx("outbox", "readwrite", (st) => st.add(e));
export const putEntry = (e: OutboxEntry) => tx("outbox", "readwrite", (st) => st.put(e));
export const deleteEntry = (seq: number) => tx("outbox", "readwrite", (st) => st.delete(seq));
export const listEntries = async () => ((await tx<OutboxEntry[]>("outbox", "readonly", (st) => st.getAll() as IDBRequest<OutboxEntry[]>)) ?? []).sort((a, b) => a.seq! - b.seq!);

export const putOrder = (o: LocalOrder) => tx("orders", "readwrite", (st) => st.put(o));
export const deleteOrder = (id: string) => tx("orders", "readwrite", (st) => st.delete(id));
export const listOrders = async () => (await tx<LocalOrder[]>("orders", "readonly", (st) => st.getAll() as IDBRequest<LocalOrder[]>)) ?? [];
