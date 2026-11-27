"use client";
// Client component: the toppings for a dish (burgers, smashers…), picked before it goes on the order. Each topping
// is charged at its own menu price (lib/modifiers.ts). A bottom sheet on phones, a small dialog on tablets.

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { MenuItem } from "@/lib/api/types";
import { titleCaseLabel } from "@/lib/bill-display";
import { formatTaka } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCart } from "./cart";

export function ToppingSheet() {
  const { sheetFor, closeSheet } = useCart();
  return (
    <Dialog open={sheetFor !== null} onOpenChange={(open) => !open && closeSheet()}>
      <DialogContent
        className={cn(
          "gap-4 p-5 sm:max-w-md",
          // Phones: docked to the bottom, full width.
          "max-sm:top-auto max-sm:bottom-0 max-sm:max-h-[85dvh] max-sm:max-w-full max-sm:translate-y-0 max-sm:overflow-y-auto max-sm:rounded-b-none",
        )}
      >
        {/* Keyed per dish so the ticks and note start empty each time. */}
        {sheetFor && <Picker key={sheetFor.id} item={sheetFor} />}
      </DialogContent>
    </Dialog>
  );
}

function Picker({ item }: { item: MenuItem }) {
  const t = useTranslations("picker");
  const { modifiers, categoryOf, add, closeSheet } = useCart();
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const category = categoryOf.get(item.id);
  const toppings = category ? modifiers.toppingsFor(item, category) : [];
  const name = titleCaseLabel(item.name);
  const total =
    item.priceTaka + toppings.filter((x) => picked.includes(x.id)).reduce((sum, x) => sum + x.priceTaka, 0);

  const confirm = (ids: string[]) => {
    add(item.id, ids, note);
    closeSheet();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        confirm(picked);
      }}
      className="grid gap-4"
    >
      <DialogHeader className="pr-8">
        <DialogTitle className="text-[18px]">{t("toppingsTitle", { name })}</DialogTitle>
        <DialogDescription>{t("toppingsLead")}</DialogDescription>
      </DialogHeader>

      <fieldset className="grid gap-1.5">
        <legend className="sr-only">{t("toppingsTitle", { name })}</legend>
        {toppings.map((x) => {
          const on = picked.includes(x.id);
          return (
            <label
              key={x.id}
              className={cn(
                "flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 text-[14.5px] transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-select/30",
                on ? "border-select bg-select/5" : "hover:border-zinc-400",
                !x.isAvailable && "cursor-not-allowed opacity-50",
              )}
            >
              <input
                type="checkbox"
                checked={on}
                disabled={!x.isAvailable}
                onChange={() => setPicked(on ? picked.filter((p) => p !== x.id) : [...picked, x.id])}
                className="size-5 accent-[var(--select)]"
              />
              <span className="min-w-0 flex-1 font-medium">{titleCaseLabel(x.name)}</span>
              <span className="text-muted-foreground tabular-nums">
                {x.isAvailable ? `+${formatTaka(x.priceTaka)}` : t("soldOut")}
              </span>
            </label>
          );
        })}
      </fieldset>

      <label className="grid gap-1.5 text-[14px] font-semibold">
        {t("itemNote")}
        <input
          value={note}
          maxLength={200}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("toppingsNotePlaceholder")}
          className="h-11 rounded-lg border border-input bg-card px-3 text-[15px] font-normal outline-none focus:border-select focus:ring-3 focus:ring-select/20"
        />
      </label>

      <div className="grid grid-cols-[auto_1fr] gap-2">
        <button
          type="button"
          onClick={() => confirm([])}
          className="h-12 rounded-xl border px-4 text-[14px] font-semibold text-zinc-700 hover:border-zinc-400 focus-visible:ring-3 focus-visible:ring-select/30 focus-visible:outline-none"
        >
          {t("noToppings")}
        </button>
        <button
          type="submit"
          className="h-12 rounded-xl bg-primary px-4 text-[15px] font-bold text-primary-foreground hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-primary/30 focus-visible:outline-none"
        >
          {t("addWithTotal", { total: formatTaka(total) })}
        </button>
      </div>
    </form>
  );
}
