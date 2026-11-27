"use client";
// Client component: the bill's customer name and phone. A full BD mobile is looked up as it is typed: a returning guest
// fills the name and shows their visits. "Attach to bill" saves the customer now; paying also saves them.

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import type { Customer } from "@/lib/api/types";

const demo = process.env.CHALAI_DEMO === "1";
/** 11 digits starting with 01, after dropping spaces, dashes and a +88 / 88 prefix. Bangla digits are converted. */
function localPhone(input: string): string | null {
  const latin = input.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
  const digits = latin.replace(/[\s-]/g, "").replace(/^\+?88/, "");
  return /^01[3-9]\d{8}$/.test(digits) ? digits : null;
}

const fieldClass =
  "flex h-11 items-center gap-2 rounded-lg bg-white px-3 ring-1 ring-zinc-300 focus-within:ring-2 focus-within:ring-orange-400";
const inputClass =
  "min-w-0 flex-1 bg-transparent text-[14.5px] font-semibold outline-none placeholder:font-normal placeholder:text-zinc-400";

export function CustomerFields({
  orderId,
  formId,
  initialName,
  initialPhone,
  attached,
  stacked = false,
}: {
  orderId: string;
  /** The payment form these inputs submit with. */
  formId: string;
  initialName: string;
  initialPhone: string;
  attached: { visitCount: number } | null;
  /** Full-width stacked inputs (bill screen). */
  stacked?: boolean;
}) {
  const t = useTranslations("bill");
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [found, setFound] = useState<{ phone: string; customer: Customer | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const local = localPhone(phone);

  // Look the phone up once it is a whole number.
  useEffect(() => {
    if (demo || !local || found?.phone === local) return;
    let live = true;
    fetch(`/api/customers?phone=${encodeURIComponent(local)}`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ customer: Customer | null }>) : null))
      .then((body) => {
        if (!live || !body) return;
        setFound({ phone: local, customer: body.customer });
        if (body.customer) setName((current) => current.trim() || body.customer!.name);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [local, found?.phone]);

  const known = found && found.phone === local ? found.customer : undefined;

  async function attach() {
    if (!local) {
      setError(t("customerBadPhone"));
      return;
    }
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/customer`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), phone: local }),
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) setError(t("customerFailed"));
    else router.refresh();
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/customer`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (!response?.ok) setError(t("customerFailed"));
    else {
      setName("");
      setPhone("");
      router.refresh();
    }
  }

  const visits = known ? known.visitCount : attached?.visitCount;
  return (
    <div className={stacked ? "" : "mt-2.5"}>
      <div className={stacked ? "grid gap-2" : "grid gap-2 sm:grid-cols-2"}>
        <label className={fieldClass}>
          <Icon name="phone" className="size-4 shrink-0 text-zinc-400" />
          <span className="sr-only">{t("customerPhone")}</span>
          <input
            form={formId}
            name="guestPhone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={20}
            autoComplete="off"
            placeholder={t("customerPhone")}
            className={`${inputClass} tabular-nums`}
          />
        </label>
        <label className={fieldClass}>
          <Icon name="users" className="size-4 shrink-0 text-zinc-400" />
          <span className="sr-only">{t("customerName")}</span>
          <input
            form={formId}
            name="guestName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            autoComplete="off"
            placeholder={t("customerName")}
            className={inputClass}
          />
        </label>
      </div>
      {/* Only takes room when there is something to say or do. */}
      <div className="flex flex-wrap items-center gap-2 text-[13px] has-[button,p>*]:mt-2">
        <p className="flex-1 text-sky-800" role="status">
          {error ? (
            <span className="text-red-600">{error}</span>
          ) : visits !== undefined ? (
            t("customerVisits", { n: visits })
          ) : known === null ? (
            t("customerNew")
          ) : null}
        </p>
        {!demo && local && name.trim() && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void attach()}
            className="h-8 rounded-md bg-sky-600 px-3 text-[13px] font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {t("customerAttach")}
          </button>
        )}
        {!demo && attached && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void remove()}
            className="h-8 rounded-md px-3 text-[13px] font-semibold text-sky-800 ring-1 ring-sky-300 hover:bg-sky-100 disabled:opacity-50"
          >
            {t("customerRemove")}
          </button>
        )}
      </div>
    </div>
  );
}
