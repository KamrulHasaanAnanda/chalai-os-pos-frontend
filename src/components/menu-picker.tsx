"use client";
// Client component: the cart (quantities, notes, search, category filter) lives in the browser until the waiter
// sends it; the server action then creates one round with an idempotency key (clientRequestId).

/* eslint-disable @next/next/no-img-element -- dish photos are absolute API URLs, already resized to WebP by the API */
import { useTranslations } from "next-intl";
import { useActionState, useMemo, useState } from "react";
import { addRound, type AddRoundState } from "@/actions/orders";
import { Icon } from "@/components/icons";
import { buttonClass } from "@/components/ui/button";
import { inputClass } from "@/components/ui/input";
import type { MenuCategory } from "@/lib/api/types";
import { formatTaka } from "@/lib/format";
import { cn } from "@/lib/utils";

type Line = { quantity: number; note: string };

const newRequestId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

export function MenuPicker({ orderId, menu }: { orderId: string; menu: MenuCategory[] }) {
  const t = useTranslations("picker");
  const tErrors = useTranslations("errors");
  const [cart, setCart] = useState<Record<string, Line>>({});
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  // One key per cart: a retried or double-tapped send reuses it (the API ignores the repeat); any change makes a new one.
  const [requestId, setRequestId] = useState(newRequestId);

  const [state, formAction, pending] = useActionState<AddRoundState, FormData>(async (prev, formData) => {
    const result = await addRound(prev, formData);
    if (result?.ok) {
      setCart({});
      setReviewOpen(false);
      setRequestId(newRequestId());
    }
    return result;
  }, null);

  const items = useMemo(() => menu.flatMap((c) => c.items), [menu]);
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const update = (id: string, change: (line: Line) => Line) => {
    setCart((current) => {
      const next = { ...current };
      const line = change(current[id] ?? { quantity: 0, note: "" });
      if (line.quantity > 0) next[id] = { ...line, quantity: Math.min(50, line.quantity) };
      else delete next[id];
      return next;
    });
    setRequestId(newRequestId());
  };

  const q = query.trim().toLowerCase();
  const visible = menu
    .filter((c) => category === "all" || c.id === category)
    .map((c) => ({ ...c, items: c.items.filter((item) => !q || item.name.toLowerCase().includes(q)) }))
    .filter((c) => c.items.length > 0);

  const lines = Object.entries(cart).filter(([id]) => byId.has(id));
  const count = lines.reduce((sum, [, line]) => sum + line.quantity, 0);
  const total = lines.reduce((sum, [id, line]) => sum + line.quantity * (byId.get(id)?.priceTaka ?? 0), 0);
  const payload = JSON.stringify(
    lines.map(([menuItemId, line]) => ({ menuItemId, quantity: line.quantity, ...(line.note.trim() ? { note: line.note.trim() } : {}) })),
  );
  const errorMessage =
    state?.error && !state.ok ? (tErrors.has(state.error as "unknown") ? tErrors(state.error as "unknown") : tErrors("unknown")) : null;
  const errorItem = state?.menuItemId ? byId.get(state.menuItemId) : undefined;

  const stepper = (id: string, name: string, quantity: number, disabled: boolean, large = false) => (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => update(id, (l) => ({ ...l, quantity: l.quantity - 1 }))}
        aria-label={t("removeOne", { name })}
        className={cn("flex items-center justify-center rounded-xl bg-[#f3ece0] text-ink hover:bg-[#ebe1cf]", large ? "size-12" : "size-11")}
      >
        <Icon name="minus" className="size-5" />
      </button>
      <span className="w-8 text-center text-[18px] font-bold tabular-nums">{quantity}</span>
      <button
        type="button"
        disabled={disabled || quantity >= 50}
        onClick={() => update(id, (l) => ({ ...l, quantity: l.quantity + 1 }))}
        aria-label={t("addOne", { name })}
        className={cn(
          "flex items-center justify-center rounded-xl bg-maroon text-white hover:bg-maroon-soft disabled:opacity-40",
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
      className="flex flex-col rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgb(34_19_15/0.04),0_8px_24px_-16px_rgb(80_30_10/0.18)] lg:sticky lg:top-20 lg:h-[calc(100dvh-104px)]"
    >
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="items" value={payload} />
      <input type="hidden" name="clientRequestId" value={requestId} />

      <div className="space-y-3 border-b border-line p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[18px] font-bold">{t("title")}</h2>
          <span className="text-[13px] text-muted-foreground">{t("hint")}</span>
        </div>
        <label className="relative block">
          <span className="sr-only">{t("search")}</span>
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className={cn(inputClass, "pl-11")}
          />
        </label>
        <div role="group" aria-label={t("categories")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
          {[{ id: "all", name: t("all") }, ...menu].map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                "h-10 shrink-0 rounded-full px-4 text-[14px] font-semibold transition-colors duration-150",
                category === c.id ? "bg-maroon text-white" : "border border-line bg-white text-[#574843] hover:bg-[#fbf6ec]",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-5 p-3 sm:p-4 lg:overflow-y-auto">
        {visible.length === 0 && <p className="py-10 text-center text-muted-foreground">{t("nothing")}</p>}
        {visible.map((c) => (
          <section key={c.id}>
            <h3 className="mb-2 text-[13px] font-semibold tracking-wide text-[#6c5d57] uppercase">{c.name}</h3>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {c.items.map((item) => {
                const quantity = cart[item.id]?.quantity ?? 0;
                const unavailable = !item.isAvailable;
                const flagged = state?.menuItemId === item.id && !state.ok;
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "relative flex flex-col overflow-hidden rounded-xl border bg-white transition-[border-color,box-shadow] duration-150",
                      quantity > 0 ? "border-maroon shadow-[0_0_0_1px_var(--maroon)]" : "border-line",
                      flagged && "border-late shadow-[0_0_0_1px_var(--late)]",
                    )}
                  >
                    <button
                      type="button"
                      disabled={unavailable || quantity >= 50}
                      onClick={() => update(item.id, (l) => ({ ...l, quantity: l.quantity + 1 }))}
                      aria-label={t("addOne", { name: item.name })}
                      className="flex flex-1 flex-col text-left disabled:cursor-not-allowed"
                    >
                      <span className="relative block aspect-[4/3] w-full bg-[#f6efe1]">
                        {item.photoUrl ? (
                          <img src={item.photoUrl} alt="" loading="lazy" className={cn("size-full object-cover", unavailable && "grayscale")} />
                        ) : (
                          <span className="flex size-full items-center justify-center text-maroon/40">
                            <Icon name="utensils" className="size-7" />
                          </span>
                        )}
                        {unavailable && (
                          <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-[13px] font-bold text-late">
                            {t("soldOut")}
                          </span>
                        )}
                        {quantity > 0 && (
                          <span className="absolute top-2 right-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-maroon px-2 text-[14px] font-bold text-white tabular-nums">
                            {quantity}
                          </span>
                        )}
                      </span>
                      <span className="block px-2.5 pt-2 pb-1">
                        <span className="line-clamp-2 text-[14.5px] leading-snug font-semibold" title={item.name}>
                          {item.name}
                        </span>
                        <span className="mt-0.5 block text-[14px] text-[#6c5d57] tabular-nums">{formatTaka(item.priceTaka)}</span>
                      </span>
                    </button>
                    {quantity > 0 && <div className="flex justify-center px-2 pb-2">{stepper(item.id, item.name, quantity, unavailable)}</div>}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="z-30 border-t border-line bg-white p-3 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-16 max-lg:shadow-[0_-8px_24px_-12px_rgb(34_19_15/0.25)] sm:p-4 md:max-lg:bottom-0 md:max-lg:left-[88px] lg:rounded-b-2xl">
        {errorMessage && (
          <p role="alert" className="mb-2 rounded-xl bg-late/[0.08] px-3 py-2 text-[14px] font-semibold text-late">
            {errorMessage}
            {errorItem && ` (${errorItem.name})`}
          </p>
        )}
        {state?.ok && count === 0 && (
          <p role="status" className="mb-2 flex items-center gap-2 rounded-xl bg-ok-soft px-3 py-2 text-[14px] font-semibold text-ok">
            <Icon name="checkCircle" className="size-4" />
            {t("sent")}
          </p>
        )}
        {count > 0 && reviewOpen && (
          <div className="mb-3 max-h-[40dvh] space-y-2 overflow-y-auto">
            {lines.map(([id, line]) => {
              const item = byId.get(id)!;
              return (
                <div key={id} className="rounded-xl bg-[#faf6ee] p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-[15px] font-semibold" title={item.name}>
                      {item.name}
                    </p>
                    {stepper(id, item.name, line.quantity, !item.isAvailable)}
                  </div>
                  <input
                    value={line.note}
                    maxLength={300}
                    onChange={(e) => update(id, (l) => ({ ...l, note: e.target.value }))}
                    placeholder={t("itemNotePlaceholder")}
                    aria-label={t("itemNote", { name: item.name })}
                    className={cn(inputClass, "mt-2 h-11 text-[15px]")}
                  />
                </div>
              );
            })}
            <label className="block text-[13px] font-semibold">
              {t("roundNote")}
              <input name="note" maxLength={300} placeholder={t("roundNotePlaceholder")} className={cn(inputClass, "mt-1 h-11 text-[15px]")} />
            </label>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={count === 0}
            onClick={() => setReviewOpen((open) => !open)}
            aria-expanded={reviewOpen}
            className="min-w-0 flex-1 rounded-xl px-2 py-1 text-left hover:bg-[#faf6ee] disabled:hover:bg-transparent"
          >
            <span className="block text-[15px] font-bold">{t("count", { n: count })}</span>
            <span className="block text-[13px] text-muted-foreground">
              {count > 0 ? (reviewOpen ? t("hideReview") : t("review")) : t("emptyCart")}
            </span>
          </button>
          <button
            type="submit"
            disabled={count === 0 || pending}
            aria-busy={pending || undefined}
            className={cn(buttonClass({ variant: "accent", size: "lg" }), "min-w-[170px]")}
          >
            {pending ? <Icon name="spinner" className="size-5 animate-spin" /> : <Icon name="chef" />}
            {pending ? t("sending") : t("send", { total: formatTaka(total) })}
          </button>
        </div>
      </div>
    </form>
  );
}
