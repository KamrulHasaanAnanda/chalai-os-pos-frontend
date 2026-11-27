"use client";
// Client component: the promotion form (fields change with the type), the on/off switches and delete confirmations.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { removePromotionAction, savePromotionAction, setPromotionActiveAction } from "@/actions/manage";
import { EmptyState } from "@/components/app/empty-state";
import { Icon } from "@/components/icons";
import type { Bilingual, DishFeedback, MenuCategory, Promotion, PromotionInput, PromotionKind } from "@/lib/api/types";
import { formatTaka } from "@/lib/format";
import { cn } from "@/lib/utils";

const KINDS: PromotionKind[] = ["dish", "package", "offer", "trial"];

type Form = {
  kind: PromotionKind;
  title: string;
  body: string;
  includes: string;
  serves: string;
  price: string;
  wasPrice: string;
  itemId: string;
  couponCode: string;
  startsOn: string;
  endsOn: string;
  fromTime: string;
  toTime: string;
  showOnMenu: boolean;
  showOnSite: boolean;
};

const blank = (kind: PromotionKind = "dish"): Form => ({
  kind,
  title: "",
  body: "",
  includes: "",
  serves: "",
  price: "",
  wasPrice: "",
  itemId: "",
  couponCode: "",
  startsOn: "",
  endsOn: "",
  fromTime: "",
  toTime: "",
  showOnMenu: true,
  showOnSite: true,
});

const input =
  "h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-[14px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500";
const label = "mb-1 block text-[12.5px] font-medium text-zinc-600";

export function ManagePromotionsView({
  promotions,
  feedback,
  menu,
  tab,
}: {
  promotions: Promotion[];
  feedback: DishFeedback[];
  menu: MenuCategory[];
  tab: "list" | "feedback";
}) {
  const t = useTranslations("managePromotions");
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<Form>(blank());
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // The guest's language first; the other when only that one was written.
  const pick = (text: Bilingual) => (locale === "bn" ? text.bn || text.en : text.en || text.bn);
  const put = (text: string, was?: Bilingual): Bilingual =>
    locale === "bn" ? { bn: text.trim(), en: was?.en ?? "" } : { en: text.trim(), bn: was?.bn ?? "" };

  // A dish's own price: while a deal runs the menu sends the deal price and the own price as wasPriceTaka.
  const dishes = useMemo(
    () =>
      menu.flatMap((c) =>
        c.items.map((i) => ({ id: i.id, name: i.name, category: c.name, price: i.wasPriceTaka ?? i.priceTaka })),
      ),
    [menu],
  );
  const dish = (id: string | null) => dishes.find((d) => d.id === id);
  const avgFor = (itemId: string | null) => feedback.find((f) => f.itemId === itemId);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  function openNew() {
    setForm(blank());
    setEditing("new");
    setError(null);
  }

  function openEdit(p: Promotion) {
    setForm({
      kind: p.kind,
      title: pick(p.title),
      body: pick(p.body),
      includes: p.includes.map(pick).join("\n"),
      serves: p.serves ? String(p.serves) : "",
      price: p.priceTaka === null ? "" : String(p.priceTaka),
      wasPrice: p.wasPriceTaka === null ? "" : String(p.wasPriceTaka),
      itemId: p.itemId ?? "",
      couponCode: p.couponCode ?? "",
      startsOn: p.startsOn ?? "",
      endsOn: p.endsOn ?? "",
      fromTime: p.fromTime ?? "",
      toTime: p.toTime ?? "",
      showOnMenu: p.showOnMenu,
      showOnSite: p.showOnSite,
    });
    setEditing(p.id);
    setError(null);
  }

  function save() {
    setError(null);
    const was = editing && editing !== "new" ? promotions.find((p) => p.id === editing) : undefined;
    const needsDish = form.kind === "dish" || form.kind === "trial";
    if (needsDish && !form.itemId) return setError(t("errDish"));
    const chosen = dish(form.itemId);
    const price = form.price.trim() === "" ? null : Number(form.price);
    if (price !== null && (!Number.isInteger(price) || price < 0)) return setError(t("errPrice"));
    if (form.kind === "dish") {
      if (price === null) return setError(t("errDealPrice"));
      if (chosen && price >= chosen.price) return setError(t("errDealLower", { price: formatTaka(chosen.price) }));
    }
    if (form.kind === "package" && price === null) return setError(t("errPrice"));
    const wasPrice = form.kind === "package" && form.wasPrice.trim() !== "" ? Number(form.wasPrice) : null;
    if (wasPrice !== null && (!Number.isInteger(wasPrice) || (price !== null && wasPrice <= price))) return setError(t("errWasPrice"));
    const title = form.title.trim() || (needsDish && chosen ? chosen.name : "");
    if (!title) return setError(t("errTitle"));
    if (form.kind === "package" && !form.includes.trim()) return setError(t("errIncludes"));
    // The website doesn't show dishes on trial: rating happens at the table.
    const onSite = form.kind !== "trial" && form.showOnSite;
    if (!form.showOnMenu && !onSite) return setError(t("errWhere"));
    if ((form.fromTime === "") !== (form.toTime === "")) return setError(t("errTimes"));

    const lines = form.includes
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const itemId = needsDish ? form.itemId : null;
    const body: PromotionInput = {
      kind: form.kind,
      title: put(title, was?.title),
      body: put(form.body, was?.body),
      includes: form.kind === "package" ? lines.map((l, i) => put(l, was?.includes[i])) : [],
      serves: form.kind === "package" && form.serves ? Number(form.serves) : null,
      priceTaka: form.kind === "dish" || form.kind === "package" ? price : null,
      wasPriceTaka: wasPrice,
      itemId,
      couponCode: form.kind === "offer" && form.couponCode.trim() ? form.couponCode.trim().toUpperCase() : null,
      // The website's button: add the dish when there is one, else call.
      action: itemId ? "order" : "call",
      startsOn: form.startsOn || null,
      endsOn: form.endsOn || null,
      days: was?.days ?? [],
      fromTime: form.fromTime || null,
      toTime: form.toTime || null,
      active: was?.active ?? true,
      popup: was?.popup ?? false,
      showOnSite: onSite,
      showOnMenu: form.showOnMenu,
    };
    start(async () => {
      const result = await savePromotionAction(editing === "new" ? null : editing, body);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setEditing(null);
      router.refresh();
    });
  }

  function toggle(p: Promotion) {
    start(async () => {
      const result = await setPromotionActiveAction(p.id, !p.active);
      if (result.ok) router.refresh();
    });
  }

  function remove(id: string) {
    if (confirmDelete !== id) return setConfirmDelete(id);
    start(async () => {
      const result = await removePromotionAction(id);
      setConfirmDelete(null);
      if (result.ok) router.refresh();
    });
  }

  const schedule = (p: Promotion) => {
    const parts: string[] = [];
    if (p.startsOn || p.endsOn) parts.push(`${p.startsOn ?? "…"} – ${p.endsOn ?? "…"}`);
    if (p.fromTime && p.toTime) parts.push(`${p.fromTime}–${p.toTime}`);
    return parts.length ? parts.join(" · ") : t("always");
  };
  const where = (p: Promotion) => [p.showOnMenu ? t("whereMenu") : null, p.showOnSite && p.kind !== "trial" ? t("whereSite") : null].filter(Boolean).join(" · ");
  const detail = (p: Promotion) => {
    const d = dish(p.itemId);
    if (p.kind === "dish") return `${d?.name ?? "—"} · ${p.priceTaka === null ? "" : formatTaka(p.priceTaka)}${d ? ` (${t("was", { price: formatTaka(d.price) })})` : ""}`;
    if (p.kind === "package")
      return [p.priceTaka === null ? null : formatTaka(p.priceTaka), p.serves ? t("serves", { count: p.serves }) : null, p.includes.map(pick).join(", ")]
        .filter(Boolean)
        .join(" · ");
    if (p.kind === "trial") {
      const f = avgFor(p.itemId);
      return `${d?.name ?? "—"}${f ? ` · ★ ${f.average} (${f.count})` : ` · ${t("noRatings")}`}`;
    }
    return [pick(p.body), p.couponCode ? t("code", { code: p.couponCode }) : null].filter(Boolean).join(" · ");
  };

  const kindLabel = (k: PromotionKind) => t(`kind_${k}`);
  const formOpen = editing !== null;

  return (
    <div className="mx-auto max-w-[760px]">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900">{t("title")}</h1>
          <p className="mt-1 text-[13.5px] text-zinc-500">{t("lead")}</p>
        </div>
        {tab === "list" && !formOpen ? (
          <button
            type="button"
            onClick={openNew}
            className="inline-flex h-10 items-center gap-1.5 rounded-md bg-zinc-900 px-4 text-[13.5px] font-medium text-white hover:bg-zinc-800"
          >
            <Icon name="plus" className="size-3.5" />
            {t("add")}
          </button>
        ) : null}
      </header>

      <nav className="mb-5 flex gap-6 border-b border-zinc-200" aria-label={t("title")}>
        {(["list", "feedback"] as const).map((k) => (
          <Link
            key={k}
            href={k === "list" ? "/manage/promotions" : "/manage/promotions?tab=feedback"}
            aria-current={tab === k ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 pb-2.5 text-[14px] font-medium",
              tab === k ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-800",
            )}
          >
            {k === "list" ? t("tabList") : t("tabFeedback", { count: feedback.reduce((n, f) => n + f.count, 0) })}
          </Link>
        ))}
      </nav>

      {tab === "feedback" ? (
        feedback.length === 0 ? (
          <EmptyState icon="star" title={t("feedbackEmpty")} body={t("feedbackEmptyBody")} className="border border-dashed border-zinc-300 bg-transparent py-14" />
        ) : (
          <ul className="space-y-4">
            {feedback.map((f) => (
              <li key={f.itemId ?? f.name} className="rounded-lg border border-zinc-200 bg-white">
                <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
                  <p className="text-[15px] font-semibold text-zinc-900">{f.name}</p>
                  <p className="text-[14px] text-zinc-600 tabular-nums">
                    <span className="font-semibold text-amber-600">★ {f.average}</span> · {t("ratings", { count: f.count })}
                  </p>
                </div>
                <ul className="divide-y divide-zinc-100">
                  {f.entries.map((e) => (
                    <li key={e.id} className="flex gap-3 px-4 py-2.5 text-[13.5px]">
                      <span className="w-[70px] shrink-0 text-amber-600" aria-label={t("stars", { count: e.rating })}>
                        {"★".repeat(e.rating)}
                        <span className="text-zinc-300">{"★".repeat(5 - e.rating)}</span>
                      </span>
                      <span className="min-w-0 flex-1 text-zinc-800">{e.comment ?? <span className="text-zinc-400">{t("noComment")}</span>}</span>
                      <span className="shrink-0 text-[12.5px] text-zinc-400">
                        {e.table ? t("table", { label: e.table }) : ""}
                        {e.table ? " · " : ""}
                        {new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(e.at))}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )
      ) : (
        <>
          {formOpen ? (
            <form
              className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 sm:p-5"
              onSubmit={(ev) => {
                ev.preventDefault();
                save();
              }}
            >
              <p className="mb-3 text-[15px] font-semibold text-zinc-900">{editing === "new" ? t("newTitle") : t("editTitle")}</p>

              <div role="radiogroup" aria-label={t("type")} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={form.kind === k}
                    onClick={() => set("kind", k)}
                    className={cn(
                      "rounded-md border px-3 py-2.5 text-left",
                      form.kind === k ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-400",
                    )}
                  >
                    <span className="block text-[13.5px] font-semibold text-zinc-900">{kindLabel(k)}</span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-zinc-500">{t(`kindHelp_${k}`)}</span>
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {form.kind === "dish" || form.kind === "trial" ? (
                  <div className="sm:col-span-2">
                    <label className={label} htmlFor="promo-dish">
                      {t("dish")}
                    </label>
                    <select id="promo-dish" value={form.itemId} onChange={(e) => set("itemId", e.target.value)} className={input}>
                      <option value="">{t("chooseDish")}</option>
                      {menu.map((c) => (
                        <optgroup key={c.id} label={c.name}>
                          {c.items.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name} · {formatTaka(i.wasPriceTaka ?? i.priceTaka)}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className="sm:col-span-2">
                  <label className={label} htmlFor="promo-title">
                    {form.kind === "dish" || form.kind === "trial" ? t("titleOptional") : t("titleField")}
                  </label>
                  <input
                    id="promo-title"
                    value={form.title}
                    maxLength={80}
                    onChange={(e) => set("title", e.target.value)}
                    placeholder={t(`titlePlaceholder_${form.kind}`)}
                    className={input}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={label} htmlFor="promo-body">
                    {t("bodyField")}
                  </label>
                  <input
                    id="promo-body"
                    value={form.body}
                    maxLength={300}
                    onChange={(e) => set("body", e.target.value)}
                    placeholder={t(`bodyPlaceholder_${form.kind}`)}
                    className={input}
                  />
                </div>

                {form.kind === "dish" ? (
                  <div>
                    <label className={label} htmlFor="promo-price">
                      {t("dealPrice")}
                    </label>
                    <input id="promo-price" inputMode="numeric" value={form.price} onChange={(e) => set("price", e.target.value.replace(/\D/g, ""))} className={input} />
                    {dish(form.itemId) ? (
                      <p className="mt-1 text-[12px] text-zinc-500">{t("dealHint", { price: formatTaka(dish(form.itemId)!.price) })}</p>
                    ) : null}
                  </div>
                ) : null}

                {form.kind === "package" ? (
                  <>
                    <div className="sm:col-span-2">
                      <label className={label} htmlFor="promo-includes">
                        {t("includes")}
                      </label>
                      <textarea
                        id="promo-includes"
                        rows={3}
                        value={form.includes}
                        onChange={(e) => set("includes", e.target.value)}
                        placeholder={t("includesPlaceholder")}
                        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-[14px] outline-none focus:border-zinc-500"
                      />
                    </div>
                    <div>
                      <label className={label} htmlFor="promo-price">
                        {t("packagePrice")}
                      </label>
                      <input id="promo-price" inputMode="numeric" value={form.price} onChange={(e) => set("price", e.target.value.replace(/\D/g, ""))} className={input} />
                    </div>
                    <div>
                      <label className={label} htmlFor="promo-was">
                        {t("wasPrice")}
                      </label>
                      <input id="promo-was" inputMode="numeric" value={form.wasPrice} onChange={(e) => set("wasPrice", e.target.value.replace(/\D/g, ""))} className={input} />
                    </div>
                    <div>
                      <label className={label} htmlFor="promo-serves">
                        {t("servesField")}
                      </label>
                      <input id="promo-serves" inputMode="numeric" value={form.serves} onChange={(e) => set("serves", e.target.value.replace(/\D/g, "").slice(0, 3))} className={input} />
                    </div>
                  </>
                ) : null}

                {form.kind === "offer" ? (
                  <div>
                    <label className={label} htmlFor="promo-code">
                      {t("couponField")}
                    </label>
                    <input
                      id="promo-code"
                      value={form.couponCode}
                      maxLength={30}
                      onChange={(e) => set("couponCode", e.target.value.toUpperCase())}
                      className={cn(input, "font-mono uppercase")}
                    />
                  </div>
                ) : null}
              </div>

              <fieldset className="mt-4 grid gap-3 border-t border-zinc-100 pt-4 sm:grid-cols-4">
                <legend className="sr-only">{t("when")}</legend>
                <div>
                  <label className={label} htmlFor="promo-from">
                    {t("startsOn")}
                  </label>
                  <input id="promo-from" type="date" value={form.startsOn} onChange={(e) => set("startsOn", e.target.value)} className={input} />
                </div>
                <div>
                  <label className={label} htmlFor="promo-to">
                    {t("endsOn")}
                  </label>
                  <input id="promo-to" type="date" value={form.endsOn} onChange={(e) => set("endsOn", e.target.value)} className={input} />
                </div>
                <div>
                  <label className={label} htmlFor="promo-ft">
                    {t("fromTime")}
                  </label>
                  <input id="promo-ft" type="time" value={form.fromTime} onChange={(e) => set("fromTime", e.target.value)} className={input} />
                </div>
                <div>
                  <label className={label} htmlFor="promo-tt">
                    {t("toTime")}
                  </label>
                  <input id="promo-tt" type="time" value={form.toTime} onChange={(e) => set("toTime", e.target.value)} className={input} />
                </div>
                <p className="text-[12px] text-zinc-500 sm:col-span-4">{t("whenHelp")}</p>
              </fieldset>

              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t border-zinc-100 pt-3">
                {(form.kind === "trial" ? (["showOnMenu"] as const) : (["showOnMenu", "showOnSite"] as const)).map((k) => (
                  <label key={k} className="flex min-h-10 items-center gap-2 text-[14px] text-zinc-800">
                    <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked)} className="size-4 accent-zinc-900" />
                    {k === "showOnMenu" ? t("showOnMenu") : t("showOnSite")}
                  </label>
                ))}
              </div>

              {error ? (
                <p className="mt-3 text-[13px] text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setEditing(null)} className="h-10 rounded-md border border-zinc-300 px-4 text-[13.5px] font-medium text-zinc-700 hover:bg-zinc-50">
                  {t("cancel")}
                </button>
                <button type="submit" disabled={pending} className="h-10 rounded-md bg-zinc-900 px-5 text-[13.5px] font-medium text-white hover:bg-zinc-800 disabled:opacity-50">
                  {pending ? t("saving") : t("save")}
                </button>
              </div>
            </form>
          ) : null}

          {promotions.length === 0 && !formOpen ? (
            <EmptyState icon="megaphone" title={t("empty")} body={t("emptyBody")} className="border border-dashed border-zinc-300 bg-transparent py-14" />
          ) : (
            <ul className="divide-y divide-zinc-200 border-y border-zinc-200">
              {promotions.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11.5px] font-semibold text-zinc-600">{kindLabel(p.kind)}</span>
                      <span className="text-[15px] font-semibold text-zinc-900">{pick(p.title)}</span>
                    </p>
                    <p className="mt-0.5 truncate text-[13px] text-zinc-600">{detail(p)}</p>
                    <p className="mt-0.5 text-[12.5px] text-zinc-400">
                      {schedule(p)} · {where(p)}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={p.active}
                    aria-label={t("activeLabel", { title: pick(p.title) })}
                    onClick={() => toggle(p)}
                    disabled={pending}
                    className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors", p.active ? "bg-emerald-600" : "bg-zinc-300")}
                  >
                    <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform", p.active ? "translate-x-[18px]" : "translate-x-0.5")} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    aria-label={t("edit")}
                    className="flex size-10 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    <Icon name="pencil" className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    disabled={pending}
                    aria-label={confirmDelete === p.id ? undefined : t("delete")}
                    className={cn(
                      "h-10 rounded-md px-2.5 text-[13px] font-medium",
                      confirmDelete === p.id ? "bg-red-600 text-white" : "text-zinc-500 hover:bg-zinc-100 hover:text-red-600",
                    )}
                  >
                    {confirmDelete === p.id ? t("confirmDelete") : <Icon name="trash" className="size-4" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
