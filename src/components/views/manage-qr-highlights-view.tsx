"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { saveQrHighlightsAction } from "@/actions/manage";
import { Icon } from "@/components/icons";
import type { ManageQrHighlights, MenuCategory } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const MAX = 4;

function flatDishes(categories: MenuCategory[]) {
  const out: { id: string; name: string; priceTaka: number }[] = [];
  const walk = (cats: MenuCategory[]) => {
    for (const c of cats) {
      for (const item of c.items) {
        if (!item.isAvailable) continue;
        out.push({ id: item.id, name: item.name, priceTaka: item.priceTaka });
      }
    }
  };
  walk(categories);
  return out;
}

export function ManageQrHighlightsView({
  saved,
  menu,
}: {
  saved: ManageQrHighlights;
  menu: MenuCategory[];
}) {
  const t = useTranslations("manageQrHighlights");
  const router = useRouter();
  const dishes = useMemo(() => flatDishes(menu), [menu]);
  const dishById = useMemo(() => new Map(dishes.map((d) => [d.id, d])), [dishes]);

  const [picked, setPicked] = useState(saved.popularItemIds);
  const [offerTitle, setOfferTitle] = useState(saved.offerTitle ?? "");
  const [offerBody, setOfferBody] = useState(saved.offerBody ?? "");
  const [pickId, setPickId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const remaining = dishes.filter((d) => !picked.includes(d.id));

  function move(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= picked.length) return;
    setPicked((prev) => {
      const copy = [...prev];
      const [row] = copy.splice(idx, 1);
      copy.splice(next, 0, row);
      return copy;
    });
  }

  function save() {
    setError(null);
    setNotice(null);
    start(async () => {
      const result = await saveQrHighlightsAction({
        popularItemIds: picked,
        offerTitle: offerTitle.trim() || null,
        offerBody: offerBody.trim() || null,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setNotice(t("saved"));
      router.refresh();
    });
  }

  const field =
    "h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-[14px] text-zinc-900 outline-none focus:border-zinc-500";

  return (
    <div className="mx-auto max-w-[520px]">
      <header className="mb-5 border-b border-zinc-200 pb-4">
        <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900">{t("title")}</h1>
        <p className="mt-1 text-[13.5px] text-zinc-500">{t("lead")}</p>
      </header>

      <p className="mb-3 text-[12.5px] text-zinc-500">{t("chefNote")}</p>

      <ul className="divide-y rounded-lg border border-zinc-200 bg-white">
        {picked.map((id, i) => {
          const dish = dishById.get(id);
          if (!dish) return null;
          return (
            <li key={id} className="flex items-center gap-2 px-3 py-2.5">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                  i === 0 ? "bg-amber-100 text-amber-900" : "bg-zinc-100 text-zinc-600",
                )}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">{dish.name}</span>
                <span className="text-[12px] text-zinc-500 tabular-nums">৳{dish.priceTaka}</span>
              </span>
              <ReorderButtons move={move} idx={i} len={picked.length} onRemove={() => setPicked((p) => p.filter((x) => x !== id))} />
            </li>
          );
        })}
        {picked.length === 0 ? (
          <li className="px-3 py-4 text-center text-[13px] text-zinc-500">{t("emptyPicks")}</li>
        ) : null}
      </ul>

      {picked.length < MAX && remaining.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <select className={cn(field, "min-w-[180px] flex-1")} value={pickId} onChange={(e) => setPickId(e.target.value)}>
            <option value="">{t("pickDish")}</option>
            {remaining.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — ৳{d.priceTaka}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!pickId}
            onClick={() => {
              if (!pickId || picked.length >= MAX) return;
              setPicked((p) => [...p, pickId]);
              setPickId("");
            }}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-[13px] font-medium disabled:opacity-50"
          >
            {t("addDish")}
          </button>
        </div>
      ) : null}

      <h2 className="mt-6 text-[15px] font-semibold text-zinc-900">{t("offerTitle")}</h2>
      <p className="mt-1 text-[13px] text-zinc-500">{t("offerLead")}</p>
      <div className="mt-3 grid gap-3">
        <input
          className={field}
          value={offerTitle}
          maxLength={120}
          placeholder={t("offerTitlePh")}
          onChange={(e) => setOfferTitle(e.target.value)}
        />
        <textarea
          className={cn(field, "min-h-[88px] py-2")}
          value={offerBody}
          maxLength={500}
          rows={3}
          placeholder={t("offerBodyPh")}
          onChange={(e) => setOfferBody(e.target.value)}
        />
      </div>

      {error ? <p className="mt-4 text-[13px] text-red-600">{error}</p> : null}
      {notice ? <p className="mt-4 text-[13px] text-emerald-700">{notice}</p> : null}

      <button
        type="button"
        disabled={pending}
        onClick={save}
        className="mt-6 h-11 w-full rounded-lg bg-zinc-900 text-[15px] font-semibold text-white disabled:opacity-60"
      >
        {t("save")}
      </button>
    </div>
  );
}

function ReorderButtons({
  move,
  idx,
  len,
  onRemove,
}: {
  move: (idx: number, dir: -1 | 1) => void;
  idx: number;
  len: number;
  onRemove: () => void;
}) {
  const btn = "flex size-8 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 disabled:opacity-30";
  return (
    <div className="flex shrink-0 gap-0.5">
      <button type="button" className={btn} disabled={idx === 0} onClick={() => move(idx, -1)} aria-label="Up">
        <Icon name="back" className="size-4 rotate-90" />
      </button>
      <button type="button" className={btn} disabled={idx === len - 1} onClick={() => move(idx, 1)} aria-label="Down">
        <Icon name="go" className="size-4 rotate-90" />
      </button>
      <button type="button" className={cn(btn, "text-red-600")} onClick={onRemove} aria-label="Remove">
        <Icon name="x" className="size-4" />
      </button>
    </div>
  );
}