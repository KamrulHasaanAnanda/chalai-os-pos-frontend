/* eslint-disable @next/next/no-img-element -- dish photos are absolute API URLs, already resized to WebP by the API */
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
  const share = items.length ? Math.round((onCount / items.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      {/* Summary: how much of the menu guests can order right now. */}
      <header className="relative overflow-hidden rounded-2xl bg-primary p-5 text-primary-foreground sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-orange-500/20 blur-3xl"
        />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-md">
            <p className="text-[12px] font-semibold tracking-[0.14em] text-orange-300 uppercase">
              {t("eyebrow")}
            </p>
            <h1 className="mt-1.5 text-[26px] leading-tight font-bold tracking-tight sm:text-[30px]">
              {t("title")}
            </h1>
            <p className="mt-1.5 text-[14px] text-zinc-400">{t("lead")}</p>
          </div>
          <div className="w-full md:w-72">
            <div className="flex items-baseline justify-between">
              <p className="text-[34px] leading-none font-bold tabular-nums">
                {onCount}
                <span className="text-[18px] font-semibold text-zinc-500">
                  /{items.length}
                </span>
              </p>
              <p
                className={cn(
                  "text-[13px] font-semibold",
                  soldOut.length ? "text-red-300" : "text-zinc-400",
                )}
              >
                {soldOut.length
                  ? t("statSoldOutCount", { n: soldOut.length })
                  : t("allOn")}
              </p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${share}%` }}
              />
            </div>
            <p className="mt-2 text-[12.5px] text-zinc-400">
              {t("onSummary", { categories: menu.length })}
            </p>
            {counted.length > 0 && (
              <p className="mt-1 text-[12.5px] text-zinc-400">
                {t("counted", { n: counted.length })}
                {low.length > 0 && (
                  <span className="font-semibold text-amber-300">
                    {" "}
                    · {t("low", { n: low.length })}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </header>

      {error.general && <Notice>{error.general}</Notice>}
      {menu.length === 0 && <Notice tone="info">{t("empty")}</Notice>}

      {/* What's off the menu right now, with one tap to bring it back. */}
      {soldOut.length > 0 && (
        <section
          aria-labelledby="sold-out"
          className="rounded-2xl border bg-card"
        >
          <h2
            id="sold-out"
            className="flex items-center gap-2 border-b px-5 py-3 text-[13px] font-bold tracking-wide text-red-700 uppercase"
          >
            <span aria-hidden className="size-1.5 rounded-full bg-red-600" />
            {t("soldOutNow", { n: soldOut.length })}
          </h2>
          <ul className="flex flex-wrap gap-2 p-4">
            {soldOut.map((item) => (
              <li key={item.id}>
                <form action={setAvailability}>
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="isAvailable" value="true" />
                  <button
                    type="submit"
                    className="group flex h-10 items-center gap-3 rounded-lg border pr-1.5 pl-3.5 text-[14px] font-medium transition-colors hover:border-select"
                  >
                    <span className="text-zinc-500 line-through decoration-zinc-300">
                      {item.name}
                    </span>
                    <span className="flex h-7 items-center rounded-md bg-primary px-2.5 text-[12px] font-semibold text-primary-foreground">
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
          className="sticky top-14 z-10 -mx-4 overflow-x-auto border-b bg-background/95 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        >
          <ul className="flex gap-6">
            {menu.map((category) => {
              const off = category.items.filter(
                (item) => !item.isAvailable,
              ).length;
              return (
                <li key={category.id} className="shrink-0">
                  <a
                    href={`#cat-${category.id}`}
                    className="-mb-px flex h-11 items-center gap-1.5 border-b-2 border-transparent text-[14px] font-medium text-muted-foreground transition-colors hover:border-select hover:text-foreground"
                  >
                    {category.name}
                    <span className="text-[12px] tabular-nums opacity-70">
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
            className="scroll-mt-28 overflow-hidden rounded-2xl border bg-card"
          >
            <div className="flex items-baseline justify-between gap-3 border-b bg-muted/40 px-5 py-3.5">
              <h2
                id={`cat-title-${category.id}`}
                className="text-[16px] font-semibold tracking-tight"
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
            <ul className="grid lg:grid-cols-2">
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
      className="scroll-mt-28 border-b px-5 py-3 last:border-b-0 lg:odd:border-r lg:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
    >
      <div className="flex items-start gap-4">
        {item.photoUrl && (
          <img
            src={item.photoUrl}
            alt=""
            loading="lazy"
            className={cn(
              "mt-0.5 size-11 shrink-0 rounded-lg object-cover",
              !on && "opacity-40 grayscale",
            )}
          />
        )}
        <div className="min-w-0 flex-1">
          {/* Menu-card line: name, dotted leader, price. */}
          <div className="flex items-baseline gap-2">
            <p
              className={cn(
                "min-w-0 truncate text-[15px] font-medium",
                !on && "text-zinc-400 line-through decoration-zinc-300",
              )}
              title={item.name}
            >
              {item.name}
            </p>
            <span
              aria-hidden
              className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-input"
            />
            <span
              className={cn(
                "shrink-0 text-[15px] font-semibold tabular-nums",
                !on && "text-zinc-400",
              )}
            >
              {formatTaka(item.priceTaka)}
            </span>
          </div>

          {/* Status, and the portion count that opens its own small editor. */}
          <details className="group" open={!!stockError}>
            <summary className="mt-1 flex w-fit cursor-pointer list-none items-center gap-2 text-[12.5px] font-medium [&::-webkit-details-marker]:hidden">
              <span className={on ? "text-muted-foreground" : "text-red-700"}>
                {on ? t("available") : t("soldOut")}
              </span>
              <span aria-hidden className="text-zinc-300">
                ·
              </span>
              {left === null ? (
                <span className="flex items-center gap-1 text-zinc-500 underline decoration-zinc-300 underline-offset-2 group-open:text-foreground hover:text-foreground">
                  <Icon name="plus" className="size-3" />
                  {t("addCount")}
                </span>
              ) : (
                <span
                  className={cn(
                    "rounded-md px-1.5 py-px font-semibold tabular-nums ring-1",
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
              "relative mt-1 h-7 w-12 rounded-full transition-colors focus-visible:ring-3 focus-visible:ring-orange-500/40 focus-visible:outline-none",
              on
                ? "bg-select hover:bg-select/90"
                : "bg-zinc-200 hover:bg-zinc-300",
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
