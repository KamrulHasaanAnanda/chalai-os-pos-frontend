"use client";
// Client components for the order ticket: the picked-but-not-sent lines ("New"), the Send button in the footer,
// the bill buttons (which warn while something isn't sent), and the panel itself, which is a bottom sheet with a
// summary bar on narrow tablets and phones.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { titleCaseLabel } from "@/lib/bill-display";
import { formatTaka } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isFlashed, useCart, useOptionalCart, type Line } from "./cart";

/** The New section of the ticket: picked lines with steppers, toppings, notes, and a note for the whole round. */
export function CartPanel() {
  const t = useTranslations("picker");
  const tErrors = useTranslations("errors");
  const { formId, orderId, lines, byId, count, total, clear, state, formAction, requestId, payload } = useCart();
  const errorMessage =
    state?.error && !state.ok
      ? tErrors.has(state.error as "unknown")
        ? tErrors(state.error as "unknown")
        : tErrors("unknown")
      : null;
  const errorItem = state?.menuItemId ? byId.get(state.menuItemId) : undefined;
  const error = errorMessage && (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[13.5px] font-semibold text-red-700">
      {errorMessage}
      {errorItem && ` (${titleCaseLabel(errorItem.name)})`}
    </p>
  );

  if (count === 0) {
    return (
      <>
        {error}
        {state?.ok && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[13.5px] font-semibold text-emerald-800"
          >
            <Icon name="checkCircle" className="size-4" />
            {t("sent")}
          </p>
        )}
        {/* Still in the page so the Send buttons have a form to point at. */}
        <form id={formId} action={formAction} hidden />
      </>
    );
  }

  return (
    <form id={formId} action={formAction} aria-labelledby={`${formId}-title`} className="grid gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="items" value={payload} />
      <input type="hidden" name="clientRequestId" value={requestId} />
      <div className="flex items-center gap-2 pt-1">
        <span className="h-px flex-1 bg-orange-300" aria-hidden />
        <h3 id={`${formId}-title`} className="text-[12.5px] font-semibold text-orange-800">
          {t("newSection", { n: count })} · {formatTaka(total)}
        </h3>
        <button
          type="button"
          onClick={clear}
          className="rounded-md px-1.5 py-0.5 text-[12.5px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {t("clear")}
        </button>
        <span className="h-px flex-1 bg-orange-300" aria-hidden />
      </div>
      <ul className="grid gap-1.5">
        {lines.map((line) => (
          <CartLine key={line.key} line={line} />
        ))}
      </ul>
      <label className="sr-only" htmlFor={`${formId}-note`}>
        {t("roundNote")}
      </label>
      <input
        id={`${formId}-note`}
        name="note"
        maxLength={200}
        placeholder={t("roundNotePlaceholder")}
        className="h-10 rounded-lg border border-input bg-card px-3 text-[14px] outline-none focus:border-select focus:ring-3 focus:ring-select/20"
      />
      {error}
    </form>
  );
}

function CartLine({ line }: { line: Line }) {
  const t = useTranslations("picker");
  const { byId, setQuantity, setNote, remove, roomFor, quantityOf, flash } = useCart();
  const [noteOpen, setNoteOpen] = useState(false);
  const row = useRef<HTMLLIElement>(null);
  const item = byId.get(line.menuItemId)!;
  const name = titleCaseLabel(item.name);
  const toppings = line.toppings.map((id) => byId.get(id)).filter((x) => !!x);
  const unit = item.priceTaka + toppings.reduce((sum, x) => sum + x.priceTaka, 0);
  const atMax = quantityOf(line.menuItemId) >= roomFor(line.menuItemId);
  const flashing = flash && isFlashed(flash, line) ? flash.n : null;
  const showNote = noteOpen || line.note !== "";

  // Bring the line just added into view (the list scrolls; the tap was on the menu).
  useEffect(() => {
    if (flashing !== null) row.current?.scrollIntoView({ block: "nearest" });
  }, [flashing]);

  return (
    <li ref={row} className="relative overflow-hidden rounded-lg border border-orange-200 bg-card px-3 py-2">
      {flashing !== null && (
        <span
          key={flashing}
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-[line-flash_700ms_ease-out_forwards] bg-orange-100 motion-reduce:hidden"
        />
      )}
      <div className="relative flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5">
            <span className="rounded bg-orange-100 px-1 text-[10.5px] font-bold tracking-wide text-orange-800">
              {t("newTag")}
            </span>
            <span className="truncate text-[14.5px] font-semibold" title={name}>
              {name}
            </span>
          </p>
          {toppings.length > 0 && (
            <ul className="mt-0.5 border-l-2 border-zinc-200 pl-2 text-[13px] text-zinc-600">
              {toppings.map((x) => (
                <li key={x.id} className="flex justify-between gap-2">
                  <span>+ {titleCaseLabel(x.name)}</span>
                  <span className="tabular-nums">{formatTaka(x.priceTaka)}</span>
                </li>
              ))}
            </ul>
          )}
          {!showNote && (
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              className="mt-0.5 text-[12.5px] font-semibold text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
            >
              {t("addNote")}
            </button>
          )}
        </div>
        <span className="pt-0.5 text-[14px] font-semibold tabular-nums">{formatTaka(unit * line.quantity)}</span>
      </div>
      {showNote && (
        <input
          value={line.note}
          maxLength={200}
          autoFocus={noteOpen && line.note === ""}
          onChange={(e) => setNote(line.key, e.target.value)}
          placeholder={t("itemNotePlaceholder")}
          aria-label={t("itemNote", { name })}
          className="relative mt-1.5 h-10 w-full rounded-lg border border-input bg-card px-3 text-[14px] text-amber-900 outline-none focus:border-select focus:ring-3 focus:ring-select/20"
        />
      )}
      <div className="relative mt-1.5 flex items-center gap-2">
        <div role="group" aria-label={t("quantityOf", { name })} className="flex items-center rounded-lg border">
          <button
            type="button"
            onClick={() => setQuantity(line.key, line.quantity - 1)}
            aria-label={t("removeOne", { name })}
            className="flex size-11 items-center justify-center rounded-l-lg text-zinc-700 hover:bg-muted focus-visible:ring-3 focus-visible:ring-select/30 focus-visible:outline-none"
          >
            <Icon name="minus" className="size-4" />
          </button>
          <span className="w-9 text-center text-[15px] font-bold tabular-nums" aria-live="polite">
            {line.quantity}
          </span>
          <button
            type="button"
            disabled={atMax}
            onClick={() => setQuantity(line.key, line.quantity + 1)}
            aria-label={t("addOne", { name })}
            className="flex size-11 items-center justify-center rounded-r-lg text-zinc-700 hover:bg-muted focus-visible:ring-3 focus-visible:ring-select/30 focus-visible:outline-none disabled:opacity-30"
          >
            <Icon name="plus" className="size-4" />
          </button>
        </div>
        <span className="text-[12.5px] text-muted-foreground tabular-nums">× {formatTaka(unit)}</span>
        <button
          type="button"
          onClick={() => remove(line.key)}
          aria-label={t("removeLine", { name })}
          title={t("removeLine", { name })}
          className="ml-auto flex size-11 items-center justify-center rounded-lg text-zinc-500 hover:bg-red-50 hover:text-red-700 focus-visible:ring-3 focus-visible:ring-select/30 focus-visible:outline-none"
        >
          <Icon name="trash" className="size-[18px]" />
        </button>
      </div>
    </li>
  );
}

/** "Not sent yet +৳X" in the totals while something is picked. */
export function UnsentTotal() {
  const t = useTranslations("picker");
  const cart = useOptionalCart();
  if (!cart || cart.count === 0) return null;
  return (
    <p className="flex items-center justify-between text-[13.5px] font-medium text-orange-800">
      <span>{t("unsent")}</span>
      <span className="tabular-nums">+{formatTaka(cart.total)}</span>
    </p>
  );
}

/** The main button: send the New lines to the kitchen. Disabled with nothing to send. */
export function SendButton({ className }: { className?: string }) {
  const t = useTranslations("picker");
  const { formId, count, pending } = useCart();
  return (
    <button
      type="submit"
      form={formId}
      disabled={count === 0 || pending}
      aria-busy={pending || undefined}
      className={cn(
        "relative flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[15px] font-bold text-primary-foreground shadow-[0_1px_2px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.10)] transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-primary/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 disabled:shadow-none aria-busy:cursor-wait aria-busy:disabled:bg-primary aria-busy:disabled:text-primary-foreground",
        className,
      )}
    >
      <span className={cn("inline-flex items-center gap-2", pending && "invisible")}>
        <Icon name="chef" className="size-5" />
        {t("sendToKitchen", { n: count })}
      </span>
      {pending && <Icon name="spinner" className="absolute size-5 animate-spin" aria-hidden />}
    </button>
  );
}

const secondary =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-input bg-card px-3 text-[14px] font-semibold text-zinc-900 shadow-xs transition-colors hover:border-zinc-400 hover:bg-zinc-50 focus-visible:ring-3 focus-visible:ring-select/30 focus-visible:outline-none aria-disabled:pointer-events-none aria-disabled:opacity-45 [&_svg]:size-[18px] [&_svg]:shrink-0";

/**
 * Request bill and Bill & payment. Disabled while nothing is on the order; while New lines aren't sent, the first
 * tap asks "Send first" or "Bill anyway" instead of leaving them behind.
 */
export function BillActions({
  orderId,
  requestBill,
  showRequest,
  billHref,
  hasItems,
}: {
  orderId: string;
  requestBill: ((formData: FormData) => void) | null;
  showRequest: boolean;
  billHref: string | null;
  hasItems: boolean;
}) {
  const t = useTranslations("order");
  const cart = useOptionalCart();
  const router = useRouter();
  const requestForm = useRef<HTMLFormElement>(null);
  const [asking, setAsking] = useState<"request" | "bill" | null>(null);
  const unsent = cart?.count ?? 0;
  if (!showRequest && !billHref) return null;

  const go = (action: "request" | "bill") => {
    setAsking(null);
    if (action === "bill" && billHref) router.push(billHref);
    if (action === "request") requestForm.current?.requestSubmit();
  };
  const attempt = (action: "request" | "bill") => (e: { preventDefault: () => void }) => {
    if (unsent > 0 && asking !== action) {
      e.preventDefault();
      setAsking(action);
    }
  };

  return (
    <div className="grid gap-2">
      {asking && unsent > 0 && (
        <div role="alert" className="rounded-lg bg-amber-50 p-2.5 text-[13.5px] text-amber-950 ring-1 ring-amber-200">
          <p className="font-semibold">{t("unsentWarn", { n: unsent })}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <SendButton className="h-10 text-[14px]" />
            <button type="button" onClick={() => go(asking)} className={cn(secondary, "h-10")}>
              {t("billAnyway")}
            </button>
          </div>
        </div>
      )}
      <div className={cn("grid gap-2", showRequest && billHref && "grid-cols-2")}>
        {showRequest && requestBill && (
          <form ref={requestForm} action={requestBill} onSubmit={attempt("request")}>
            <input type="hidden" name="orderId" value={orderId} />
            <button type="submit" disabled={!hasItems} className={cn(secondary, "disabled:pointer-events-none disabled:opacity-45")}>
              <Icon name="receipt" />
              {t("requestBill")}
            </button>
          </form>
        )}
        {billHref && (
          <Link
            href={billHref}
            aria-disabled={!hasItems || undefined}
            tabIndex={hasItems ? undefined : -1}
            onClick={attempt("bill")}
            className={secondary}
          >
            <Icon name="cash" />
            {t("openBill")}
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * The order panel. Laptops and wide tablets: a full-height column beside the menu. Narrower: hidden behind a
 * summary bar ("3 items · ৳780 · View order") and opened as a bottom sheet.
 */
export function OrderPanel({
  label,
  sentCount,
  sentTotal,
  children,
}: {
  label: string;
  sentCount: number;
  sentTotal: number;
  children: ReactNode;
}) {
  const t = useTranslations("picker");
  const cart = useOptionalCart();
  const [open, setOpen] = useState(false);
  const close = useRef<HTMLButtonElement>(null);
  const items = sentCount + (cart?.count ?? 0);
  const total = sentTotal + (cart?.total ?? 0);

  useEffect(() => {
    if (!open) return;
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {open && (
        <div aria-hidden className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
      )}
      <section
        aria-label={label}
        role={open ? "dialog" : undefined}
        aria-modal={open || undefined}
        className={cn(
          "flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-xs lg:h-full",
          open
            ? "max-lg:fixed max-lg:inset-x-0 max-lg:top-[8dvh] max-lg:bottom-0 max-lg:z-50 max-lg:rounded-b-none max-lg:shadow-2xl"
            : "max-lg:hidden",
        )}
      >
        <div className="flex justify-center pt-2 lg:hidden">
          <button
            ref={close}
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("closeOrder")}
            className="flex h-6 w-16 items-center justify-center rounded-full focus-visible:ring-3 focus-visible:ring-select/30 focus-visible:outline-none"
          >
            <span aria-hidden className="h-1.5 w-12 rounded-full bg-zinc-300" />
          </button>
        </div>
        {children}
      </section>

      {/* Narrow screens: what's on the order, one tap to open it, and Send. */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t bg-card p-3 shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.25)] md:bottom-0 md:left-16 lg:hidden print:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex min-h-12 min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border px-3 text-left hover:border-zinc-400 focus-visible:ring-3 focus-visible:ring-select/30 focus-visible:outline-none"
          >
            <span className="truncate text-[14.5px] font-semibold tabular-nums">
              {t("summary", { n: items, total: formatTaka(total) })}
            </span>
            <span className="shrink-0 text-[13.5px] font-semibold text-select">{t("viewOrder")}</span>
          </button>
          {cart && cart.count > 0 && <SendButton className="w-auto shrink-0" />}
        </div>
      </div>
    </>
  );
}
