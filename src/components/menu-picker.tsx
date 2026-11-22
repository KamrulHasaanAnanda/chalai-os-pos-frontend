"use client";
// Client components: the cart (quantities, notes) lives in the browser until the waiter sends it; the server action
// then creates one round with an idempotency key (clientRequestId). The menu grid adds to the cart, and the cart
// shows inside the order ticket (CartPanel), like a till: tap a dish on the left, it appears on the right.

/* eslint-disable @next/next/no-img-element -- dish photos are absolute API URLs, already resized to WebP by the API */
import { useTranslations } from "next-intl";
import {
  createContext,
  useActionState,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { addRound, type AddRoundState } from "@/actions/orders";
import { requestKotPrint } from "@/components/print/kot-printer";
import { Icon } from "@/components/icons";
import { inputClass } from "@/components/app/field";
import type { MenuCategory, MenuItem } from "@/lib/api/types";
import { formatTaka } from "@/lib/format";
import { cn } from "@/lib/utils";

type Line = { quantity: number; note: string };

/** Initial tint per category, so dishes without a photo still read apart. */
const TONES = [
  "bg-orange-100 text-orange-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
];

const newRequestId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

type Cart = {
  orderId: string;
  formId: string;
  menu: MenuCategory[];
  byId: Map<string, MenuItem>;
  cart: Record<string, Line>;
  lines: [string, Line][];
  count: number;
  total: number;
  update: (id: string, change: (line: Line) => Line) => void;
  clear: () => void;
  state: AddRoundState;
  formAction: (formData: FormData) => void;
  pending: boolean;
  requestId: string;
};

const CartContext = createContext<Cart | null>(null);

function useCart(): Cart {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart outside OrderCartProvider");
  return cart;
}

/** Holds the cart for one order; the menu grid and the ticket's cart panel both read it. */
export function OrderCartProvider({
  orderId,
  menu,
  children,
}: {
  orderId: string;
  menu: MenuCategory[];
  children: ReactNode;
}) {
  const [cart, setCart] = useState<Record<string, Line>>({});
  // One key per cart: a retried or double-tapped send reuses it (the API ignores the repeat); any change makes a new one.
  const [requestId, setRequestId] = useState(newRequestId);
  const [state, formAction, pending] = useActionState<AddRoundState, FormData>(
    async (prev, formData) => {
      const result = await addRound(prev, formData);
      if (result?.ok) {
        if (result.printRoundId) requestKotPrint(result.printRoundId);
        setCart({});
        setRequestId(newRequestId());
      }
      return result;
    },
    null,
  );
  const byId = useMemo(
    () => new Map(menu.flatMap((c) => c.items).map((item) => [item.id, item])),
    [menu],
  );

  const update = (id: string, change: (line: Line) => Line) => {
    setCart((current) => {
      const next = { ...current };
      const line = change(current[id] ?? { quantity: 0, note: "" });
      if (line.quantity > 0)
        next[id] = { ...line, quantity: Math.min(50, line.quantity) };
      else delete next[id];
      return next;
    });
    setRequestId(newRequestId());
  };

  const lines = Object.entries(cart).filter(([id]) => byId.has(id));
  const value: Cart = {
    orderId,
    formId: `cart-${orderId}`,
    menu,
    byId,
    cart,
    lines,
    count: lines.reduce((sum, [, line]) => sum + line.quantity, 0),
    total: lines.reduce(
      (sum, [id, line]) => sum + line.quantity * (byId.get(id)?.priceTaka ?? 0),
      0,
    ),
    update,
    clear: () => {
      setCart({});
      setRequestId(newRequestId());
    },
    state,
    formAction,
    pending,
    requestId,
  };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/** The menu: search, category chips and compact dish tiles. Tapping a tile adds one to the cart. */
export function MenuPicker() {
  const t = useTranslations("picker");
  const { menu, cart, update, state } = useCart();
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const visible = menu
    .filter((c) => category === "all" || c.id === category)
    .map((c) => ({
      ...c,
      items: c.items.filter(
        (item) => !q || item.name.toLowerCase().includes(q),
      ),
    }))
    .filter((c) => c.items.length > 0);

  return (
    <section
      aria-label={t("title")}
      className="flex flex-col rounded-2xl border bg-card shadow-xs lg:h-full"
    >
      <div className="space-y-3 border-b p-3 sm:p-4">
        <label className="relative block">
          <span className="sr-only">{t("search")}</span>
          <Icon
            name="search"
            className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className={cn(inputClass, "h-11 bg-white pl-11")}
          />
        </label>
        <div
          role="group"
          aria-label={t("categories")}
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5"
        >
          {[{ id: "all", name: t("all") }, ...menu].map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                "h-9 shrink-0 rounded-full px-3.5 text-[13.5px] font-semibold transition-colors duration-150",
                category === c.id
                  ? "bg-select text-white"
                  : "border border-border bg-white text-zinc-600 hover:border-input hover:text-zinc-900",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-5 p-3 max-lg:pb-28 sm:p-4 lg:overflow-y-auto">
        {visible.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">
            {t("nothing")}
          </p>
        )}
        {visible.map((c) => {
          const tone =
            TONES[
              Math.max(
                0,
                menu.findIndex((m) => m.id === c.id),
              ) % TONES.length
            ];
          return (
            <section key={c.id} aria-labelledby={`cat-${c.id}`}>
              <h3
                id={`cat-${c.id}`}
                className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold tracking-wide text-muted-foreground uppercase"
              >
                {c.name}
                <span className="tabular-nums">{c.items.length}</span>
              </h3>
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-2">
                {c.items.map((item) => {
                  const quantity = cart[item.id]?.quantity ?? 0;
                  const unavailable = !item.isAvailable;
                  const left = item.stockLeft ?? null;
                  const full = quantity >= Math.min(50, left ?? 50);
                  const flagged = state?.menuItemId === item.id && !state.ok;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        disabled={unavailable || full}
                        onClick={() =>
                          update(item.id, (l) => ({
                            ...l,
                            quantity: l.quantity + 1,
                          }))
                        }
                        aria-label={t("addOne", { name: item.name })}
                        className={cn(
                          "relative flex h-[74px] w-full items-center gap-3 rounded-xl border bg-white p-2.5 text-left transition-[border-color,box-shadow,transform] duration-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100",
                          quantity > 0
                            ? "border-select ring-1 ring-select"
                            : "border-border hover:border-zinc-400 hover:shadow-sm",
                          unavailable && "bg-zinc-50 opacity-60",
                          flagged && "border-red-500 ring-1 ring-red-500",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "flex size-[52px] shrink-0 items-center justify-center overflow-hidden rounded-lg text-[18px] font-bold",
                            item.photoUrl ? "bg-zinc-100" : tone,
                          )}
                        >
                          {item.photoUrl ? (
                            <img
                              src={item.photoUrl}
                              alt=""
                              loading="lazy"
                              className={cn(
                                "size-full object-cover",
                                unavailable && "grayscale",
                              )}
                            />
                          ) : (
                            item.name.trim().charAt(0).toUpperCase()
                          )}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span
                            className="line-clamp-2 text-[14px] leading-snug font-semibold"
                            title={item.name}
                          >
                            {item.name}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-[13.5px] font-semibold text-zinc-600 tabular-nums">
                            {unavailable ? (
                              <span className="text-red-600">
                                {t("soldOut")}
                              </span>
                            ) : (
                              formatTaka(item.priceTaka)
                            )}
                            {!unavailable && left !== null && (
                              <span
                                className={cn(
                                  "rounded px-1 text-[11px] font-bold",
                                  left - quantity <= 3
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-zinc-100 text-zinc-600",
                                )}
                              >
                                {t("left", {
                                  n: Math.max(0, left - quantity),
                                })}
                              </span>
                            )}
                          </span>
                        </span>
                        {quantity > 0 && (
                          <span className="absolute -top-2 -right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-select px-1.5 text-[12.5px] font-bold text-white ring-2 ring-white tabular-nums">
                            {quantity}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </section>
  );
}

/**
 * The dishes picked but not sent yet, at the top of the ticket: quantities, a note per dish and for the order, and
 * Send. Nothing when the cart is empty. The form lives here; the phone bar's Send button submits it by id.
 */
export function CartPanel() {
  const t = useTranslations("picker");
  const tErrors = useTranslations("errors");
  const {
    formId,
    orderId,
    lines,
    byId,
    count,
    total,
    update,
    clear,
    state,
    formAction,
    pending,
    requestId,
  } = useCart();
  const [notesFor, setNotesFor] = useState<Record<string, boolean>>({});
  const errorMessage =
    state?.error && !state.ok
      ? tErrors.has(state.error as "unknown")
        ? tErrors(state.error as "unknown")
        : tErrors("unknown")
      : null;
  const errorItem = state?.menuItemId ? byId.get(state.menuItemId) : undefined;
  const payload = JSON.stringify(
    lines.map(([menuItemId, line]) => ({
      menuItemId,
      quantity: line.quantity,
      ...(line.note.trim() ? { note: line.note.trim() } : {}),
    })),
  );

  if (count === 0) {
    return (
      <>
        {errorMessage && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-[14px] font-semibold text-red-700"
          >
            {errorMessage}
            {errorItem && ` (${errorItem.name})`}
          </p>
        )}
        {state?.ok && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[14px] font-semibold text-emerald-700"
          >
            <Icon name="checkCircle" className="size-4" />
            {t("sent")}
          </p>
        )}
        {/* Still in the page so the phone bar's Send button has a form to point at. */}
        <form id={formId} action={formAction} hidden />
      </>
    );
  }

  return (
    <form
      id={formId}
      action={formAction}
      className="overflow-hidden rounded-xl border-2 border-primary bg-white"
    >
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="items" value={payload} />
      <input type="hidden" name="clientRequestId" value={requestId} />
      <div className="flex items-center justify-between gap-2 bg-primary px-3 py-2 text-primary-foreground">
        <p className="text-[13.5px] font-semibold">
          {t("newTitle", { n: count })}
        </p>
        <button
          type="button"
          onClick={clear}
          className="rounded-md px-2 py-1 text-[12.5px] font-semibold text-zinc-300 hover:bg-white/10 hover:text-white"
        >
          {t("clear")}
        </button>
      </div>
      <ul className="divide-y">
        {lines.map(([id, line]) => {
          const item = byId.get(id)!;
          const atMax =
            !item.isAvailable ||
            line.quantity >= Math.min(50, item.stockLeft ?? 50);
          const showNote = notesFor[id] || line.note !== "";
          return (
            <li key={id} className="px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-[14.5px] font-semibold"
                    title={item.name}
                  >
                    {item.name}
                  </p>
                  <p className="text-[12.5px] text-muted-foreground tabular-nums">
                    {formatTaka(item.priceTaka)}
                    {!showNote && (
                      <button
                        type="button"
                        onClick={() =>
                          setNotesFor((n) => ({ ...n, [id]: true }))
                        }
                        className="ml-2 font-semibold text-zinc-700 underline-offset-2 hover:underline"
                      >
                        {t("addNote")}
                      </button>
                    )}
                  </p>
                </div>
                <div className="flex items-center rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() =>
                      update(id, (l) => ({ ...l, quantity: l.quantity - 1 }))
                    }
                    aria-label={t("removeOne", { name: item.name })}
                    className="flex size-10 items-center justify-center rounded-l-lg text-zinc-700 hover:bg-zinc-100"
                  >
                    <Icon
                      name={line.quantity === 1 ? "x" : "minus"}
                      className="size-4"
                    />
                  </button>
                  <span className="w-8 text-center text-[15px] font-bold tabular-nums">
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    disabled={atMax}
                    onClick={() =>
                      update(id, (l) => ({ ...l, quantity: l.quantity + 1 }))
                    }
                    aria-label={t("addOne", { name: item.name })}
                    className="flex size-10 items-center justify-center rounded-r-lg text-zinc-700 hover:bg-zinc-100 disabled:opacity-30"
                  >
                    <Icon name="plus" className="size-4" />
                  </button>
                </div>
                <span className="w-16 text-right text-[14px] font-semibold tabular-nums">
                  {formatTaka(item.priceTaka * line.quantity)}
                </span>
              </div>
              {showNote && (
                <input
                  value={line.note}
                  maxLength={300}
                  autoFocus={notesFor[id] && line.note === ""}
                  onChange={(e) =>
                    update(id, (l) => ({ ...l, note: e.target.value }))
                  }
                  placeholder={t("itemNotePlaceholder")}
                  aria-label={t("itemNote", { name: item.name })}
                  className={cn(inputClass, "mt-2 h-10 bg-white text-[14px]")}
                />
              )}
            </li>
          );
        })}
      </ul>
      <div className="space-y-2 border-t bg-zinc-50 p-3">
        <label className="sr-only" htmlFor={`${formId}-note`}>
          {t("roundNote")}
        </label>
        <input
          id={`${formId}-note`}
          name="note"
          maxLength={300}
          placeholder={t("roundNotePlaceholder")}
          className={cn(inputClass, "h-10 bg-white text-[14px]")}
        />
        {errorMessage && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-[13.5px] font-semibold text-red-700"
          >
            {errorMessage}
            {errorItem && ` (${errorItem.name})`}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
          className="relative flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-bold text-primary-foreground shadow-[0_1px_2px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.10)] transition-colors hover:bg-primary/90 disabled:cursor-wait disabled:opacity-100"
        >
          <span className={cn("inline-flex items-center gap-2", pending && "invisible")}>
            <Icon name="chef" className="size-5" />
            {t("send", { total: formatTaka(total) })}
          </span>
          {pending && <Icon name="spinner" className="absolute size-5 animate-spin" aria-hidden />}
        </button>
      </div>
    </form>
  );
}

/** Phones, on the menu tab: what's picked and Send, docked above the bottom nav. Submits the ticket's cart form. */
export function CartBar({ reviewHref }: { reviewHref: string }) {
  const t = useTranslations("picker");
  const { formId, count, total, pending } = useCart();
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-16 z-30 border-t bg-white p-3 shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.25)] md:bottom-0 md:left-[88px] lg:hidden">
      <div className="flex items-center gap-2">
        <a
          href={reviewHref}
          className="min-w-0 flex-1 rounded-lg px-2 py-1 hover:bg-zinc-50"
        >
          <span className="block text-[15px] font-bold">
            {t("count", { n: count })}
          </span>
          <span className="block text-[12.5px] text-muted-foreground">
            {t("review")}
          </span>
        </a>
        <button
          type="submit"
          form={formId}
          disabled={pending}
          aria-busy={pending || undefined}
          className="relative flex h-12 min-w-[160px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[15px] font-bold text-primary-foreground disabled:cursor-wait disabled:opacity-100"
        >
          <span className={cn("inline-flex items-center gap-2", pending && "invisible")}>
            <Icon name="chef" className="size-5" />
            {t("send", { total: formatTaka(total) })}
          </span>
          {pending && <Icon name="spinner" className="absolute size-5 animate-spin" aria-hidden />}
        </button>
      </div>
    </div>
  );
}

/** Hides its children while dishes are picked (the ticket's "Nothing ordered yet" box). */
export function WhenCartEmpty({ children }: { children: ReactNode }) {
  const { count } = useCart();
  return count > 0 ? null : <>{children}</>;
}
