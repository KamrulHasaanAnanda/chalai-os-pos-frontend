"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateBranchAction } from "@/actions/manage";
import { Icon } from "@/components/icons";
import type { ManageBranch } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export function ManageBranchView({ branch }: { branch: ManageBranch }) {
  const t = useTranslations("manageBranch");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [phone, setPhone] = useState(branch.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(branch.whatsapp ?? "");
  const [address, setAddress] = useState(branch.address ?? "");
  const [pickup, setPickup] = useState(branch.pickupEnabled);
  const [delivery, setDelivery] = useState(branch.deliveryEnabled);
  const [prep, setPrep] = useState(String(branch.prepMinutes ?? 20));

  function save() {
    setError(null);
    setNotice(null);
    const prepMinutes = Number(prep);
    if (!Number.isInteger(prepMinutes) || prepMinutes < 5 || prepMinutes > 180) {
      setError(t("badPrep"));
      return;
    }
    start(async () => {
      const result = await updateBranchAction({
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        address: address.trim(),
        pickupEnabled: pickup,
        deliveryEnabled: delivery,
        prepMinutes,
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
        <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900">
          {t("title")}
        </h1>
        <p className="mt-1 text-[13.5px] text-zinc-500">{t("lead")}</p>
      </header>

      <div className="grid gap-5">
        <Field label={t("phone")}>
          <input
            value={phone}
            onChange={(ev) => setPhone(ev.target.value)}
            type="tel"
            inputMode="numeric"
            placeholder="01XXXXXXXXX"
            className={cn(field, "tabular-nums")}
          />
        </Field>
        <Field label={t("whatsapp")}>
          <input
            value={whatsapp}
            onChange={(ev) => setWhatsapp(ev.target.value)}
            type="tel"
            inputMode="numeric"
            placeholder="01XXXXXXXXX"
            className={cn(field, "tabular-nums")}
          />
        </Field>
        <Field label={t("address")}>
          <input
            value={address}
            onChange={(ev) => setAddress(ev.target.value)}
            className={field}
          />
        </Field>
        <Field label={t("prep")}>
          <input
            value={prep}
            onChange={(ev) => setPrep(ev.target.value)}
            inputMode="numeric"
            className={cn(field, "tabular-nums sm:max-w-[8rem]")}
          />
        </Field>

        <div className="divide-y divide-zinc-200 border-y border-zinc-200">
          <ToggleRow
            title={t("pickup")}
            help={t("pickupHelp")}
            checked={pickup}
            onChange={setPickup}
          />
          <ToggleRow
            title={t("delivery")}
            help={t("deliveryHelp")}
            checked={delivery}
            onChange={setDelivery}
          />
        </div>

        {error && (
          <p className="text-[13px] text-red-600" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="text-[13px] text-emerald-700" role="status">
            {notice}
          </p>
        )}

        <button
          type="button"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={save}
          className="relative inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-md bg-zinc-900 text-[14px] font-medium text-white disabled:cursor-wait disabled:opacity-100 sm:w-auto sm:px-8"
        >
          <span className={cn(pending && "invisible")}>{t("save")}</span>
          {pending && <Icon name="spinner" className="absolute size-4 animate-spin" aria-hidden />}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[12.5px] font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

function ToggleRow({
  title,
  help,
  checked,
  onChange,
}: {
  title: string;
  help: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3.5">
      <span className="min-w-0">
        <span className="block text-[14px] font-medium text-zinc-900">
          {title}
        </span>
        <span className="mt-0.5 block text-[12.5px] text-zinc-500">{help}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-zinc-900" : "bg-zinc-300",
        )}
      >
        <span
          className={cn(
            "inline-block size-5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}
