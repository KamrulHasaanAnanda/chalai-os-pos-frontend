"use client";
// Client component: the dishes picked but not sent yet live in the browser until Send; the server action then
// creates one round with an idempotency key (clientRequestId). The menu grid, the topping sheet, the ticket's
// "New" lines and the Send button all read this one cart.

import {
  createContext,
  useActionState,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { addRound, type AddRoundState } from "@/actions/orders";
import { requestKotPrint } from "@/components/print/kot-printer";
import type { MenuCategory, MenuItem } from "@/lib/api/types";
import { modifierSetup, toppingNote, type ModifierSetup } from "@/lib/modifiers";

/** One picked line: a dish, how many, its note, and the toppings on each of them. */
export type Line = { key: string; menuItemId: string; quantity: number; note: string; toppings: string[] };

const MAX_QTY = 50;

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

type Cart = {
  orderId: string;
  formId: string;
  menu: MenuCategory[];
  byId: Map<string, MenuItem>;
  categoryOf: Map<string, MenuCategory>;
  modifiers: ModifierSetup;
  lines: Line[];
  /** Dishes picked (toppings not counted): the N in "Send to kitchen (N)". */
  count: number;
  /** What the picked lines add to the bill, toppings included. */
  total: number;
  /** How many of a dish are picked, across lines. */
  quantityOf: (menuItemId: string) => number;
  /** The most a line of this dish can grow to (stock left, max 50). */
  roomFor: (menuItemId: string) => number;
  /** Tap on a dish: one more (opens the topping sheet first when the dish takes toppings, unless `skipSheet`). */
  tap: (item: MenuItem, skipSheet?: boolean) => void;
  add: (menuItemId: string, toppings?: string[], note?: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  setNote: (key: string, note: string) => void;
  remove: (key: string) => void;
  clear: () => void;
  /** The line last added to (the ticket flashes it); `n` changes on every add. */
  flash: { key: string; n: number } | null;
  /** The dish waiting in the topping sheet. */
  sheetFor: MenuItem | null;
  closeSheet: () => void;
  askToppings: boolean;
  setAskToppings: (ask: boolean) => void;
  state: AddRoundState;
  formAction: (formData: FormData) => void;
  pending: boolean;
  requestId: string;
  /** The round's items as the API takes them: each dish, then its toppings as their own marked lines. */
  payload: string;
};

const CartContext = createContext<Cart | null>(null);

export function useCart(): Cart {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart outside OrderCartProvider");
  return cart;
}

/** The cart, or null outside an open order (closed orders have no menu). */
export function useOptionalCart(): Cart | null {
  return useContext(CartContext);
}

// "Ask for toppings" is a per-device setting (localStorage), read without a hydration mismatch.
const ASK_KEY = "chalai-pos-ask-toppings";
const ASK_EVENT = "chalai-pos-ask-toppings";
const subscribeAsk = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(ASK_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(ASK_EVENT, onChange);
  };
};
const readAsk = () => {
  try {
    return localStorage.getItem(ASK_KEY) !== "0";
  } catch {
    return true;
  }
};

export function OrderCartProvider({
  orderId,
  menu,
  children,
}: {
  orderId: string;
  menu: MenuCategory[];
  children: ReactNode;
}) {
  const [lines, setLines] = useState<Line[]>([]);
  // One key per cart: a retried or double-tapped send reuses it (the API ignores the repeat); any change makes a new one.
  const [requestId, setRequestId] = useState(newId);
  const [flash, setFlash] = useState<{ key: string; n: number } | null>(null);
  const [sheetFor, setSheetFor] = useState<MenuItem | null>(null);
  const askToppings = useSyncExternalStore(subscribeAsk, readAsk, () => true);
  const [state, formAction, pending] = useActionState<AddRoundState, FormData>(async (prev, formData) => {
    const result = await addRound(prev, formData);
    if (result?.ok) {
      if (result.printRoundId) requestKotPrint(result.printRoundId);
      setLines([]);
      setRequestId(newId());
    }
    return result;
  }, null);

  const { byId, categoryOf } = useMemo(() => {
    const byId = new Map<string, MenuItem>();
    const categoryOf = new Map<string, MenuCategory>();
    for (const c of menu)
      for (const item of c.items) {
        byId.set(item.id, item);
        categoryOf.set(item.id, c);
      }
    return { byId, categoryOf };
  }, [menu]);
  const modifiers = useMemo(() => modifierSetup(menu), [menu]);

  const live = lines.filter((l) => byId.has(l.menuItemId));
  const quantityOf = (menuItemId: string) =>
    live.filter((l) => l.menuItemId === menuItemId).reduce((sum, l) => sum + l.quantity, 0);
  const roomFor = (menuItemId: string) => {
    const item = byId.get(menuItemId);
    if (!item?.isAvailable) return 0;
    return Math.min(MAX_QTY, item.stockLeft ?? MAX_QTY);
  };

  const changed = (next: Line[]) => {
    setLines(next);
    setRequestId(newId());
  };

  const add = (menuItemId: string, toppings: string[] = [], note = "") => {
    if (quantityOf(menuItemId) >= roomFor(menuItemId)) return;
    const plain = toppings.length === 0 && note.trim() === "";
    // The same dish with nothing on it grows its line; with toppings or a note it is a line of its own.
    const same = plain ? live.find((l) => l.menuItemId === menuItemId && l.toppings.length === 0 && l.note === "") : undefined;
    if (same) {
      changed(lines.map((l) => (l.key === same.key ? { ...l, quantity: l.quantity + 1 } : l)));
      setFlash((f) => ({ key: same.key, n: (f?.n ?? 0) + 1 }));
    } else {
      const key = newId();
      changed([...lines, { key, menuItemId, quantity: 1, note: note.trim(), toppings }]);
      setFlash((f) => ({ key, n: (f?.n ?? 0) + 1 }));
    }
  };

  const tap = (item: MenuItem, skipSheet = false) => {
    const category = categoryOf.get(item.id);
    const offered = category ? modifiers.toppingsFor(item, category) : [];
    if (!skipSheet && askToppings && offered.length > 0) setSheetFor(item);
    else add(item.id);
  };

  const count = live.reduce((sum, l) => sum + l.quantity, 0);
  const total = live.reduce(
    (sum, l) =>
      sum +
      l.quantity *
        ((byId.get(l.menuItemId)?.priceTaka ?? 0) +
          l.toppings.reduce((s, t) => s + (byId.get(t)?.priceTaka ?? 0), 0)),
    0,
  );
  const payload = JSON.stringify(
    live.flatMap((l) => {
      const dish = byId.get(l.menuItemId)!;
      return [
        { menuItemId: l.menuItemId, quantity: l.quantity, ...(l.note ? { note: l.note } : {}) },
        ...l.toppings
          .filter((t) => byId.has(t))
          .map((t) => ({ menuItemId: t, quantity: l.quantity, note: toppingNote(dish.name) })),
      ];
    }),
  );

  const value: Cart = {
    orderId,
    formId: `cart-${orderId}`,
    menu,
    byId,
    categoryOf,
    modifiers,
    lines: live,
    count,
    total,
    quantityOf,
    roomFor,
    tap,
    add,
    setQuantity: (key, quantity) => {
      const line = live.find((l) => l.key === key);
      if (!line) return;
      const others = quantityOf(line.menuItemId) - line.quantity;
      const q = Math.min(quantity, roomFor(line.menuItemId) - others);
      changed(q > 0 ? lines.map((l) => (l.key === key ? { ...l, quantity: q } : l)) : lines.filter((l) => l.key !== key));
    },
    setNote: (key, note) => changed(lines.map((l) => (l.key === key ? { ...l, note } : l))),
    remove: (key) => changed(lines.filter((l) => l.key !== key)),
    clear: () => changed([]),
    flash,
    sheetFor,
    closeSheet: () => setSheetFor(null),
    askToppings,
    setAskToppings: (ask) => {
      try {
        localStorage.setItem(ASK_KEY, ask ? "1" : "0");
      } catch {
        // Private mode: the setting lasts until reload.
      }
      window.dispatchEvent(new Event(ASK_EVENT));
    },
    state,
    formAction,
    pending,
    requestId,
    payload,
  };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/** Hides its children while dishes are picked. */
export function WhenCartEmpty({ children }: { children: ReactNode }) {
  const cart = useOptionalCart();
  return cart && cart.count > 0 ? null : <>{children}</>;
}
