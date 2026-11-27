/* eslint-disable @next/next/no-img-element -- dish photos are absolute API URLs, already resized to WebP by the API */
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { setAvailability, setStock } from "@/actions/menu";
import { Icon } from "@/components/icons";
import { Notice } from "@/components/app/field";
import type { MenuCategory, MenuItem } from "@/lib/api/types";
import type { ErrorReader } from "@/lib/error-reader";
import { formatTaka } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Managers mark dishes sold out (and back) in one tap. Guests' QR menus and waiters' pickers update live. */
export function MenuView({
  menu,
  error,
}: {
  menu: MenuCategory[];
  error: ErrorReader;
}) {
  const t = useTranslations("menu");
  const items = menu.flatMap((c) => c.items);
  const soldOut = items.filter((item) => !item.isAvailable);
  const onCount = items.length - soldOut.length;
  const counted = items.filter((item) => item.stockLeft != null);
  const low = counted.filter(
    (item) => item.isAvailable && item.stockLeft! <= LOW_STOCK,
  );

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      {/* Title row like Floor and the owner app: icon tile, title and lead; the counts on the right. */}
      <header className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <span
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700"
          >
            <Icon name="book" className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-[22px] leading-tight font-bold tracking-tight sm:text-[24px]">
              {t("title")}
            </h1>
            <p className="mt-0.5 text-[14px] text-muted-foreground">
              {t("lead")}
            </p>
          </div>
        </div>
        <ul className="flex flex-wrap gap-2 text-[13px] font-medium tabular-nums">
          <Stat dot="bg-emerald-500">
            {t("onOf", { on: onCount, total: items.length })}
          </Stat>
          {soldOut.length > 0 ? (
            <Stat dot="bg-red-600" className="text-red-800">
              {t("statSoldOutCount", { n: soldOut.length })}
            </Stat>
          ) : (
            items.length > 0 && <Stat>{t("allOn")}</Stat>
          )}
          {low.length > 0 && (
            <Stat dot="bg-amber-500" className="text-amber-900">
              {t("low", { n: low.length })}
            </Stat>
          )}
        </ul>
      </header>

      {error.general && <Notice>{error.general}</Notice>}
      {menu.length === 0 && <Notice tone="info">{t("empty")}</Notice>}

      {/* What's off the menu right now, with one tap to bring it back. */}
      {soldOut.length > 0 && (
        <section
          aria-labelledby="sold-out"
          className="rounded-xl border border-red-200 bg-red-50/50 p-4"
        >
          <h2
            id="sold-out"
            className="flex items-center gap-2 text-[14px] font-semibold text-red-800"
          >
            <span aria-hidden className="size-2 rounded-full bg-red-600" />
            {t("soldOutNow", { n: soldOut.length })}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {soldOut.map((item) => (
              <li key={item.id}>
                <form action={setAvailability}>
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="isAvailable" value="true" />
                  <button
                    type="submit"
                    className="flex h-10 items-center gap-3 rounded-lg border bg-card pr-1.5 pl-3.5 text-[14px] font-medium transition-colors hover:border-select focus-visible:ring-3 focus-visible:ring-select/30 focus-visible:outline-none"
                  >
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="flex h-7 items-center rounded-md bg-select px-2.5 text-[12.5px] font-semibold text-select-foreground">
                      {t("bringBack")}
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Jump to a category. */}
      {menu.length > 1 && (
        <nav
          aria-label={t("categories")}
          className="sticky top-14 z-10 -mx-4 overflow-x-auto bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        >
          <ul className="flex gap-2">
            {menu.map((category) => {
              const off = category.items.filter(
                (item) => !item.isAvailable,
              ).length;
              return (
                <li key={category.id} className="shrink-0">
                  <a
                    href={`#cat-${category.id}`}
                    className="flex h-9 items-center gap-1.5 rounded-full border bg-card px-3.5 text-[13.5px] font-medium text-foreground transition-colors hover:border-zinc-400 focus-visible:ring-3 focus-visible:ring-select/30 focus-visible:outline-none"
                  >
                    {category.name}
                    <span className="text-[12px] text-muted-foreground tabular-nums">
                      {category.items.length}
                    </span>
                    {off > 0 && (
                      <span
                        aria-hidden
                        className="size-1.5 rounded-full bg-red-600"
                      />
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {menu.map((category) => {
        const off = category.items.filter((item) => !item.isAvailable).length;
        return (
          <section
            key={category.id}
            id={`cat-${category.id}`}
            aria-labelledby={`cat-title-${category.id}`}
            className="scroll-mt-32"
          >
            <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
              <h2
                id={`cat-title-${category.id}`}
                className="text-[15px] font-semibold"
              >
                {category.name}
              </h2>
              <p className="text-[12.5px] font-medium text-muted-foreground tabular-nums">
                {off > 0 ? (
                  <span className="text-red-700">
                    {t("categoryOff", { n: off, total: category.items.length })}
                  </span>
                ) : (
                  t("categoryCount", { n: category.items.length })
                )}
              </p>
            </div>
            <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {category.items.map((item) => (
                <DishRow
                  key={item.id}
                  item={item}
                  error={error.forForm(`item-${item.id}`)}
                  stockError={error.forForm(`stock-${item.id}`)}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

const LOW_STOCK = 3;

function Stat({
  dot,
  className,
  children,
}: {
  dot?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <li
      className={cn(
        "flex h-8 items-center gap-2 rounded-full border bg-card px-3",
        className,
      )}
    >
      {dot && <span aria-hidden className={cn("size-2 rounded-full", dot)} />}
      {children}
    </li>
  );
}

function DishRow({
  item,
  error,
  stockError,
}: {
  item: MenuItem;
  error?: string;
  stockError?: string;
}) {
  const t = useTranslations("menu");
  const on = item.isAvailable;
  const left = item.stockLeft ?? null;
  const low = on && left !== null && left <= LOW_STOCK;
  return (
    <li
      id={`item-${item.id}`}
      className={cn(
        "scroll-mt-32 rounded-xl border bg-card px-3.5 py-3 transition-colors",
        !on && "border-dashed bg-muted/40",
      )}
    >
      <div className="flex items-start gap-3">
        {item.photoUrl && (
          <img
            src={item.photoUrl}
            alt=""
            loading="lazy"
            className={cn(
              "size-11 shrink-0 rounded-lg object-cover",
              !on && "opacity-40 grayscale",
            )}
          />
        )}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-[14.5px] leading-snug font-medium",
              !on && "text-muted-foreground",
            )}
            title={item.name}
          >
            {item.name}
          </p>

          {/* Price and status; the portion count opens its own small editor underneath. */}
          <details className="group" open={!!stockError}>
            <summary className="mt-1 flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 text-[13px] [&::-webkit-details-marker]:hidden">
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  on ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {formatTaka(item.priceTaka)}
              </span>
              {!on && (
                <span className="rounded-md bg-red-50 px-1.5 py-px text-[12px] font-semibold text-red-700 ring-1 ring-red-200">
                  {t("soldOut")}
                </span>
              )}
              {left === null ? (
                <span className="flex h-6 items-center gap-1 rounded-md px-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors group-open:bg-muted group-open:text-foreground hover:bg-muted hover:text-foreground">
                  <Icon name="plus" className="size-3" />
                  {t("addCount")}
                </span>
              ) : (
                <span
                  className={cn(
                    "rounded-md px-1.5 py-px text-[12px] font-semibold tabular-nums ring-1",
                    left === 0
                      ? "bg-red-50 text-red-700 ring-red-200"
                      : low
                        ? "bg-amber-50 text-amber-800 ring-amber-200"
                        : "bg-zinc-50 text-zinc-800 ring-zinc-200",
                  )}
                >
                  {t("left", { n: left })}
                </span>
              )}
            </summary>

            <form
              action={setStock}
              className="mt-2.5 flex flex-wrap items-center gap-2"
            >
              <input type="hidden" name="itemId" value={item.id} />
              <label className="flex h-9 items-center gap-2 rounded-lg border bg-background pr-1 pl-3 focus-within:border-select">
                <span className="text-[12.5px] font-medium text-muted-foreground">
                  {t("portionsLeft")}
                </span>
                <input
                  name="stockLeft"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  defaultValue={left ?? ""}
                  placeholder="20"
                  aria-label={t("countFor", { name: item.name })}
                  className="w-14 bg-transparent text-right text-[15px] font-semibold tabular-nums outline-none"
                />
              </label>
              <button
                type="submit"
                className="h-9 rounded-lg bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t("saveCount")}
              </button>
              {left !== null && (
                <button
                  type="submit"
                  name="clear"
                  value="1"
                  className="h-9 rounded-lg px-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t("stopCounting")}
                </button>
              )}
              <p className="w-full text-[12px] text-muted-foreground">
                {t("countHint")}
              </p>
              {stockError && (
                <p className="w-full text-[13px] font-medium text-red-700">
                  {stockError}
                </p>
              )}
            </form>
          </details>
        </div>

        <form action={setAvailability} className="shrink-0">
          <input type="hidden" name="itemId" value={item.id} />
          <input
            type="hidden"
            name="isAvailable"
            value={on ? "false" : "true"}
          />
          <button
            type="submit"
            role="switch"
            aria-checked={on}
            aria-label={t("toggle", { name: item.name })}
            title={on ? t("markSoldOut") : t("markAvailable")}
            className={cn(
              "relative mt-0.5 h-7 w-12 rounded-full transition-colors focus-visible:ring-3 focus-visible:ring-select/30 focus-visible:outline-none",
              on
                ? "bg-select hover:bg-select/90"
                : "bg-zinc-300 hover:bg-zinc-400",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform",
                on ? "translate-x-5" : "translate-x-0",
              )}
            />
          </button>
        </form>
      </div>
      {error && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-red-700">
          <Icon name="alert" className="size-3.5" />
          {error}
        </p>
      )}
    </li>
  );
}
