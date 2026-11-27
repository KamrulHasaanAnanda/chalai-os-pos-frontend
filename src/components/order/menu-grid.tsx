"use client";
// Client component: search, scroll-spy and taps. The menu side of the order screen: a category rail on the left
// (a chip row on phones) and the dish grid, which scrolls on its own on tablets and laptops.

/* eslint-disable @next/next/no-img-element -- dish photos are absolute API URLs, already resized to WebP by the API */
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import type { MenuItem } from "@/lib/api/types";
import { titleCaseLabel } from "@/lib/bill-display";
import { formatTaka } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCart } from "./cart";
import { ToppingSheet } from "./topping-sheet";

const LONG_PRESS_MS = 450;

export function MenuPicker() {
  const t = useTranslations("picker");
  const { menu, modifiers, tap, askToppings, setAskToppings } = useCart();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);

  // Topping groups are offered in the sheet, not as dishes of their own.
  const categories = menu.filter((c) => !modifiers.groupIds.has(c.id) && c.items.length > 0);
  const q = query.trim().toLowerCase();
  const sections = categories
    .map((c) => ({ ...c, items: q ? c.items.filter((item) => item.name.toLowerCase().includes(q)) : c.items }))
    .filter((c) => c.items.length > 0);
  const first = sections.flatMap((c) => c.items).find((item) => item.isAvailable);
  const current = active ?? sections[0]?.id ?? null;

  // "/" puts the cursor in the search from anywhere on the screen (not while typing elsewhere).
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== "/" || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      const el = ev.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      ev.preventDefault();
      search.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Scroll-spy: the category whose section is at the top of the grid is the one lit in the rail.
  const sectionIds = sections.map((c) => c.id).join(",");
  useEffect(() => {
    const box = scroller.current;
    if (!box || !sectionIds) return;
    const root = getComputedStyle(box).overflowY === "auto" ? box : null;
    const seen = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set((e.target as HTMLElement).dataset.category!, e.isIntersecting);
        const top = sectionIds.split(",").find((id) => seen.get(id));
        if (top) setActive(top);
      },
      { root, rootMargin: root ? "0px 0px -65% 0px" : "-120px 0px -60% 0px" },
    );
    box.querySelectorAll<HTMLElement>("[data-category]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sectionIds]);

  const jump = (id: string) => {
    setActive(id);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(`menu-cat-${id}`)?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section aria-label={t("title")} className="md:grid md:h-full md:min-h-0 md:grid-cols-[156px_minmax(0,1fr)] md:gap-4">
      {/* Categories: a sticky rail beside the grid; a chip row on phones. */}
      <nav aria-label={t("categories")} className="max-md:sticky max-md:top-14 max-md:z-10 max-md:-mx-4 max-md:bg-background max-md:px-4 max-md:py-2 md:min-h-0 md:overflow-y-auto md:pb-4">
        <ul className="flex gap-1.5 max-md:overflow-x-auto md:flex-col md:gap-0.5">
          {categories.map((c) => {
            const on = c.id === current;
            const shown = sections.find((s) => s.id === c.id)?.items.length ?? 0;
            return (
              <li key={c.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => jump(c.id)}
                  disabled={shown === 0}
                  aria-current={on ? "true" : undefined}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-[13.5px] font-medium transition-colors focus-visible:ring-3 focus-visible:ring-select/30 focus-visible:outline-none disabled:opacity-40",
                    "max-md:rounded-full max-md:border max-md:bg-card max-md:min-h-10",
                    on
                      ? "bg-zinc-900 text-white max-md:border-zinc-900 max-md:bg-zinc-900"
                      : "text-zinc-700 hover:bg-zinc-200/60 hover:text-zinc-950",
                  )}
                >
                  <span className="min-w-0 flex-1 leading-snug md:line-clamp-2">{titleCaseLabel(c.name)}</span>
                  <span className={cn("text-[12px] tabular-nums", on ? "text-white/70" : "text-muted-foreground")}>
                    {q ? shown : c.items.length}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div ref={scroller} className="min-w-0 md:min-h-0 md:overflow-y-auto md:pr-1">
        {/* Search stays on top while the grid scrolls. */}
        <div className="sticky top-0 z-10 bg-background pb-3 max-md:top-[7.5rem]">
          <div className="flex items-center gap-2">
            <label className="relative block min-w-0 flex-1">
              <span className="sr-only">{t("search")}</span>
              <Icon
                name="search"
                className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground"
              />
              <input
                ref={search}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && first) {
                    e.preventDefault();
                    tap(first);
                  } else if (e.key === "Escape" && query) {
                    setQuery("");
                  }
                }}
                placeholder={t("searchPlaceholder")}
                aria-describedby="menu-search-hint"
                className="h-12 w-full rounded-xl border border-input bg-card pr-12 pl-10 text-[15px] shadow-xs outline-none placeholder:text-muted-foreground focus:border-select focus:ring-3 focus:ring-select/20 [&::-webkit-search-cancel-button]:hidden"
              />
              <kbd
                aria-hidden
                className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-[11px] text-muted-foreground lg:block"
              >
                /
              </kbd>
            </label>
            {modifiers.groupIds.size > 0 && (
              <button
                type="button"
                role="switch"
                aria-checked={askToppings}
                onClick={() => setAskToppings(!askToppings)}
                title={t("askToppingsHint")}
                className="flex h-12 shrink-0 items-center gap-2 rounded-xl border bg-card px-3 text-[13px] font-medium text-zinc-700 hover:border-zinc-400 focus-visible:ring-3 focus-visible:ring-select/30 focus-visible:outline-none"
              >
                <span
                  aria-hidden
                  className={cn(
                    "relative h-5 w-8 rounded-full transition-colors",
                    askToppings ? "bg-select" : "bg-zinc-300",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform",
                      askToppings && "translate-x-3",
                    )}
                  />
                </span>
                <span className="max-sm:sr-only">{t("askToppings")}</span>
              </button>
            )}
          </div>
          <p id="menu-search-hint" className="sr-only">
            {t("shortcut")}
          </p>
        </div>

        {sections.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-[15px] font-medium text-zinc-700">{t("noMatch", { q: query.trim() })}</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                search.current?.focus();
              }}
              className="h-10 rounded-lg border bg-card px-4 text-[14px] font-semibold hover:border-zinc-400"
            >
              {t("clearSearch")}
            </button>
          </div>
        )}

        <div className="space-y-6 pb-6 max-lg:pb-32">
          {sections.map((c) => (
            <section
              key={c.id}
              id={`menu-cat-${c.id}`}
              data-category={c.id}
              aria-labelledby={`menu-cat-title-${c.id}`}
              className="scroll-mt-20 max-md:scroll-mt-48"
            >
              <h3
                id={`menu-cat-title-${c.id}`}
                className="mb-2 text-[13px] font-semibold tracking-wide text-muted-foreground"
              >
                {titleCaseLabel(c.name)}
              </h3>
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2">
                {c.items.map((item) => (
                  <li key={item.id}>
                    <Tile item={item} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
      <ToppingSheet />
    </section>
  );
}

/** One dish: tap adds one (or opens the toppings), long-press adds one without the sheet. */
function Tile({ item }: { item: MenuItem }) {
  const t = useTranslations("picker");
  const { tap, quantityOf, roomFor, state } = useCart();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const quantity = quantityOf(item.id);
  const room = roomFor(item.id);
  const unavailable = !item.isAvailable;
  const full = !unavailable && quantity >= room;
  const left = item.stockLeft ?? null;
  const flagged = state?.menuItemId === item.id && !state.ok;
  const name = titleCaseLabel(item.name);

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  return (
    <button
      type="button"
      disabled={unavailable || full}
      onPointerDown={() => {
        longPressed.current = false;
        cancel();
        timer.current = setTimeout(() => {
          longPressed.current = true;
          tap(item, true);
        }, LONG_PRESS_MS);
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (longPressed.current) {
          longPressed.current = false;
          return;
        }
        tap(item);
      }}
      aria-label={t("addOne", { name })}
      className={cn(
        "group relative flex h-full min-h-[88px] w-full flex-col overflow-hidden rounded-xl border bg-card text-left shadow-xs transition-[transform,border-color,box-shadow] duration-100 select-none [-webkit-touch-callout:none]",
        "hover:border-zinc-400 hover:shadow-sm focus-visible:ring-3 focus-visible:ring-select/30 focus-visible:outline-none active:scale-[0.97] motion-reduce:active:scale-100",
        "disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none disabled:hover:border-border disabled:active:scale-100",
        quantity > 0 && "border-select ring-1 ring-select",
        flagged && "border-red-500 ring-1 ring-red-500",
      )}
    >
      {item.photoUrl && (
        <img
          src={item.photoUrl}
          alt=""
          loading="lazy"
          draggable={false}
          className={cn("h-20 w-full object-cover", unavailable && "grayscale")}
        />
      )}
      <span className="flex flex-col gap-1 p-3">
        <span className="line-clamp-2 text-[14.5px] leading-snug font-semibold text-zinc-900" title={name}>
          {name}
        </span>
        <span className="flex flex-wrap items-center gap-1.5 text-[14px] tabular-nums">
          {unavailable ? (
            <span className="font-semibold text-red-700">{t("soldOut")}</span>
          ) : (
            <span className="font-medium text-zinc-600">{formatTaka(item.priceTaka)}</span>
          )}
          {!unavailable && left !== null && (
            <span
              className={cn(
                "rounded px-1 text-[11.5px] font-semibold",
                left - quantity <= 3 ? "bg-amber-100 text-amber-900" : "bg-zinc-100 text-zinc-700",
              )}
            >
              {t("left", { n: Math.max(0, left - quantity) })}
            </span>
          )}
        </span>
      </span>
      {quantity > 0 && (
        <span
          aria-hidden
          className="absolute top-1.5 right-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-select px-1.5 text-[12.5px] font-bold text-white shadow-sm ring-2 ring-white tabular-nums"
        >
          {quantity}
        </span>
      )}
      {quantity > 0 && <span className="sr-only">{t("inCart", { n: quantity })}</span>}
    </button>
  );
}
