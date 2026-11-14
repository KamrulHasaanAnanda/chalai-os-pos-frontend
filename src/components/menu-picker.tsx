"use client";
// Client component: the cart (quantities, notes, search, category filter) lives in the browser until the waiter
// sends it; the server action then creates one round with an idempotency key (clientRequestId).

/* eslint-disable @next/next/no-img-element -- dish photos are absolute API URLs, already resized to WebP by the API */
import { useTranslations } from "next-intl";
import { useActionState, useMemo, useState } from "react";
import { addRound, type AddRoundState } from "@/actions/orders";
import { Icon } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
import { inputClass } from "@/components/app/field";
import type { MenuCategory } from "@/lib/api/types";
import { formatTaka } from "@/lib/format";
import { cn } from "@/lib/utils";

type Line = { quantity: number; note: string };

/** Placeholder tint per category, so dishes without a photo still read apart. */
const TONES = [
  "bg-orange-100 text-orange-500",
  "bg-amber-100 text-amber-600",
  "bg-emerald-100 text-emerald-600",
  "bg-sky-100 text-sky-600",
  "bg-rose-100 text-rose-500",
  "bg-violet-100 text-violet-500",
];

const newRequestId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

export function MenuPicker({
  orderId,
  menu,
}: {
  orderId: string;
  menu: MenuCategory[];
}) {
  const t = useTranslations("picker");
  const tErrors = useTranslations("errors");
  const [cart, setCart] = useState<Record<string, Line>>({});
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  // One key per cart: a retried or double-tapped send reuses it (the API ignores the repeat); any change makes a new one.
  const [requestId, setRequestId] = useState(newRequestId);

  const [state, formAction, pending] = useActionState<AddRoundState, FormData>(
    async (prev, formData) => {
      const result = await addRound(prev, formData);
      if (result?.ok) {
        setCart({});
        setReviewOpen(false);
        setRequestId(newRequestId());
      }
      return result;
    },
    null,
  );

  const items = useMemo(() => menu.flatMap((c) => c.items), [menu]);
  const byId = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
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

  const lines = Object.entries(cart).filter(([id]) => byId.has(id));
  const count = lines.reduce((sum, [, line]) => sum + line.quantity, 0);
  const total = lines.reduce(
    (sum, [id, line]) => sum + line.quantity * (byId.get(id)?.priceTaka ?? 0),
    0,
  );
  const payload = JSON.stringify(
    lines.map(([menuItemId, line]) => ({
      menuItemId,
      quantity: line.quantity,
      ...(line.note.trim() ? { note: line.note.trim() } : {}),
    })),
  );
  const errorMessage =
    state?.error && !state.ok
      ? tErrors.has(state.error as "unknown")
        ? tErrors(state.error as "unknown")
        : tErrors("unknown")
      : null;
  const errorItem = state?.menuItemId ? byId.get(state.menuItemId) : undefined;

  const stepper = (
    id: string,
    name: string,
    quantity: number,
    disabled: boolean,
    large = false,
  ) => (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => update(id, (l) => ({ ...l, quantity: l.quantity - 1 }))}
        aria-label={t("removeOne", { name })}
        className={cn(
          "flex items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
          large ? "size-11" : "size-10",
        )}
      >
        <Icon name="minus" className="size-5" />
      </button>
      <span className="w-8 text-center text-[18px] font-semibold tabular-nums">
        {quantity}
      </span>
      <button
        type="button"
        disabled={disabled || quantity >= 50}
        onClick={() => update(id, (l) => ({ ...l, quantity: l.quantity + 1 }))}
        aria-label={t("addOne", { name })}
        className={cn(
          "flex items-center justify-center rounded-lg bg-orange-500 text-white hover:bg-orange-400 disabled:opacity-40",
          large ? "size-12" : "size-11",
        )}
      >
        <Icon name="plus" className="size-5" />
      </button>
    </div>
  );

  return (
    <form
      action={formAction}
      className="flex flex-col rounded-2xl border border-line bg-card shadow-sm lg:h-full"
    >
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="items" value={payload} />
      <input type="hidden" name="clientRequestId" value={requestId} />

      <div className="space-y-3 border-b border-line p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-[18px] font-bold">
            <span
              aria-hidden
              className="flex size-8 items-center justify-center rounded-lg bg-orange-500 text-white"
            >
              <Icon name="plus" className="size-4" />
            </span>
            {t("title")}
          </h2>
          <span className="text-[13px] text-muted-foreground">{t("hint")}</span>
        </div>
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
            className={cn(inputClass, "pl-11")}
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
                  ? "bg-maroon text-ivory"
                  : "border border-line bg-card text-muted-foreground hover:bg-gray",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-5 p-3 sm:p-4 lg:overflow-y-auto">
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
            <section key={c.id}>
              <h3 className="mb-2 flex items-center gap-2 text-[13px] font-bold tracking-wide text-zinc-700 uppercase">
                <span
                  aria-hidden
                  className={cn(
                    "size-2.5 rounded-full",
                    tone.split(" ")[0].replace("100", "500"),
                  )}
                />
                {c.name}
                <span className="font-semibold text-muted-foreground tabular-nums">
                  {c.items.length}
                </span>
              </h3>
              <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {c.items.map((item) => {
                  const quantity = cart[item.id]?.quantity ?? 0;
                  const unavailable = !item.isAvailable;
                  const left = item.stockLeft ?? null;
                  const full = quantity >= Math.min(50, left ?? 50);
                  const flagged = state?.menuItemId === item.id && !state.ok;
                  return (
                    <li
                      key={item.id}
                      className={cn(
                        "group relative flex flex-col overflow-hidden rounded-xl border-2 transition-[border-color,box-shadow,background-color] duration-150",
                        quantity > 0
                          ? "border-orange-500 bg-orange-50 shadow-md shadow-orange-500/15"
                          : "border-zinc-200 bg-card hover:border-zinc-400 hover:shadow-sm",
                        flagged && "border-late",
                      )}
                    >
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
                        className="flex flex-1 flex-col text-left disabled:cursor-not-allowed"
                      >
                        <span
                          className={cn(
                            "relative block aspect-[16/10] w-full",
                            item.photoUrl ? "bg-gray" : tone,
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
                            <span className="flex size-full items-center justify-center">
                              <Icon name="utensils" className="size-7" />
                            </span>
                          )}
                          {unavailable && (
                            <span className="absolute inset-0 flex items-center justify-center bg-white/80 text-[13px] font-semibold text-late">
                              {t("soldOut")}
                            </span>
                          )}
                          {!unavailable && left !== null && (
                            <span
                              className={cn(
                                "absolute top-2 right-2 rounded-md px-1.5 py-0.5 text-[11.5px] font-bold tabular-nums shadow-sm",
                                left - quantity <= 3
                                  ? "bg-amber-400 text-amber-950"
                                  : "bg-white/90 text-zinc-800",
                              )}
                            >
                              {t("left", { n: Math.max(0, left - quantity) })}
                            </span>
                          )}
                          {quantity > 0 && (
                            <span className="absolute top-2 left-2 flex h-7 items-center gap-1 rounded-full bg-orange-500 pr-2.5 pl-1.5 text-[13px] font-bold text-white shadow-sm ring-2 ring-white tabular-nums">
                              <Icon name="check" className="size-4" />
                              {t("inCart", { n: quantity })}
                            </span>
                          )}
                        </span>
                        <span className="flex flex-1 flex-col px-2.5 pt-2 pb-2.5">
                          <span
                            className="line-clamp-2 text-[14px] leading-snug font-semibold"
                            title={item.name}
                          >
                            {item.name}
                          </span>
                          <span className="mt-auto flex items-center justify-between gap-2 pt-1.5">
                            <span
                              className={cn(
                                "font-bold tabular-nums",
                                quantity > 1
                                  ? "text-[13px] text-muted-foreground"
                                  : "text-[15px]",
                              )}
                            >
                              {formatTaka(item.priceTaka)}
                            </span>
                            {quantity > 1 && (
                              <span className="text-[15px] font-bold text-orange-700 tabular-nums">
                                {formatTaka(item.priceTaka * quantity)}
                              </span>
                            )}
                            {!unavailable && quantity === 0 && (
                              <span
                                aria-hidden
                                className="flex size-7 items-center justify-center rounded-lg bg-zinc-900 text-white transition-colors group-hover:bg-orange-500"
                              >
                                <Icon name="plus" className="size-4" />
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                      {quantity > 0 && (
                        <div className="px-2 pb-2">
                          <div className="flex h-10 items-stretch overflow-hidden rounded-lg bg-zinc-900 text-white shadow-sm">
                            <button
                              type="button"
                              onClick={() =>
                                update(item.id, (l) => ({
                                  ...l,
                                  quantity: l.quantity - 1,
                                }))
                              }
                              aria-label={t("removeOne", { name: item.name })}
                              className="flex flex-1 items-center justify-center transition-colors hover:bg-white/10"
                            >
                              <Icon
                                name={quantity === 1 ? "x" : "minus"}
                                className="size-4"
                              />
                            </button>
                            <span className="flex min-w-9 items-center justify-center text-[16px] font-bold tabular-nums">
                              {quantity}
                            </span>
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
                              className="flex flex-1 items-center justify-center bg-orange-500 transition-colors hover:bg-orange-400 disabled:opacity-40"
                            >
                              <Icon name="plus" className="size-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="z-30 border-t border-line bg-card p-3 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-16 max-lg:shadow-[0_-8px_24px_-12px_rgb(34_19_15/0.25)] sm:p-4 md:max-lg:bottom-0 md:max-lg:left-[88px] lg:rounded-b-2xl">
        {errorMessage && (
          <p
            role="alert"
            className="mb-2 rounded-md bg-late/[0.08] px-3 py-2 text-[14px] font-semibold text-late"
          >
            {errorMessage}
            {errorItem && ` (${errorItem.name})`}
          </p>
        )}
        {state?.ok && count === 0 && (
          <p
            role="status"
            className="mb-2 flex items-center gap-2 rounded-md bg-ok-soft px-3 py-2 text-[14px] font-semibold text-ok"
          >
            <Icon name="checkCircle" className="size-4" />
            {t("sent")}
          </p>
        )}
        {count > 0 && reviewOpen && (
          <div className="mb-3 max-h-[40dvh] space-y-2 overflow-y-auto">
            {lines.map(([id, line]) => {
              const item = byId.get(id)!;
              return (
                <div key={id} className="rounded-md bg-gray p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className="min-w-0 truncate text-[15px] font-semibold"
                      title={item.name}
                    >
                      {item.name}
                    </p>
                    {stepper(
                      id,
                      item.name,
                      line.quantity,
                      !item.isAvailable ||
                        line.quantity >= (item.stockLeft ?? 50),
                    )}
                  </div>
                  <input
                    value={line.note}
                    maxLength={300}
                    onChange={(e) =>
                      update(id, (l) => ({ ...l, note: e.target.value }))
                    }
                    placeholder={t("itemNotePlaceholder")}
                    aria-label={t("itemNote", { name: item.name })}
                    className={cn(inputClass, "mt-2 h-11 text-[15px]")}
                  />
                </div>
              );
            })}
            <label className="block text-[13px] font-semibold">
              {t("roundNote")}
              <input
                name="note"
                maxLength={300}
                placeholder={t("roundNotePlaceholder")}
                className={cn(inputClass, "mt-1 h-11 text-[15px]")}
              />
            </label>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={count === 0}
            onClick={() => setReviewOpen((open) => !open)}
            aria-expanded={reviewOpen}
            className="min-w-0 flex-1 rounded-md px-2 py-1 text-left hover:bg-gray disabled:hover:bg-transparent"
          >
            <span className="flex items-center gap-2 text-[15px] font-bold">
              <span
                aria-hidden
                className={cn(
                  "flex size-7 items-center justify-center rounded-lg",
                  count > 0
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-400",
                )}
              >
                <Icon name="bag" className="size-4" />
              </span>
              {t("count", { n: count })}
            </span>
            <span className="block text-[13px] text-muted-foreground">
              {count > 0
                ? reviewOpen
                  ? t("hideReview")
                  : t("review")
                : t("emptyCart")}
            </span>
          </button>
          <button
            type="submit"
            disabled={count === 0 || pending}
            aria-busy={pending || undefined}
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "h-12 min-w-[170px] rounded-xl bg-orange-600 text-[15px] font-bold hover:bg-orange-500",
            )}
          >
            {pending ? (
              <Icon name="spinner" className="size-5 animate-spin" />
            ) : (
              <Icon name="chef" />
            )}
            {pending ? t("sending") : t("send", { total: formatTaka(total) })}
          </button>
        </div>
      </div>
    </form>
  );
}
