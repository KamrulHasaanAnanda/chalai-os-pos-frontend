"use client";
// One day's bookings for this branch (reservations spec). Times are Asia/Dhaka. Everyone on the floor can read the
// list; `canManage` (owner, manager, or a cashier/waiter with the owner's grant) adds, edits, seats and cancels.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { saveReservationAction, setReservationStatusAction } from "@/actions/reservations";
import { EmptyState } from "@/components/app/empty-state";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Reservation, ReservationDay, ReservationStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type Area = { id: string; name: string; tables: { id: string; label: string; seats: number }[] };

const TZ = "Asia/Dhaka";
const dhakaDate = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
/** "YYYY-MM-DDTHH:MM" in Dhaka, for a datetime-local input. */
const dhakaInput = (iso: string) => {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
  return `${dhakaDate(d)}T${time}`;
};
/** A datetime-local value read as Dhaka time (UTC+6, no daylight saving). */
const fromDhakaInput = (value: string) => new Date(`${value}:00+06:00`).toISOString();
/** The calendar day `days` after a "YYYY-MM-DD" (noon, so it never slips a day). */
const shiftDay = (date: string, days: number) =>
  dhakaDate(new Date(new Date(`${date}T12:00:00+06:00`).getTime() + days * 86_400_000));
/** The next half hour from now, as a datetime-local value: a sensible default for a booking made today. */
const nextHalfHour = () => dhakaInput(new Date(Math.ceil(Date.now() / 1_800_000) * 1_800_000).toISOString());

const ERROR_CODES = ["table_taken", "too_many", "bad_phone", "bad_party", "in_the_past", "no_permission", "forbidden"] as const;
/** The message key for an API error code; anything unknown is the generic one. */
const errorKey = (code: string) =>
  (ERROR_CODES as readonly string[]).includes(code)
    ? (`errors.${code}` as `errors.${(typeof ERROR_CODES)[number]}`)
    : ("errors.other" as const);

const STATUS_TONE: Record<ReservationStatus, string> = {
  booked: "bg-sky-50 text-sky-800 ring-sky-200",
  seated: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  cancelled: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  no_show: "bg-red-50 text-red-700 ring-red-200",
};

export function ReservationsView({
  day,
  date,
  today,
  areas,
  canManage,
}: {
  day: ReservationDay;
  date: string;
  today: string;
  areas: Area[];
  canManage: boolean;
}) {
  const t = useTranslations("reservations");
  const locale = useLocale();
  const tag = locale === "bn" ? "bn-BD" : "en-GB";
  const time = (iso: string) =>
    new Intl.DateTimeFormat(tag, { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
  const dayName = new Intl.DateTimeFormat(tag, { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(
    new Date(`${date}T12:00:00+06:00`),
  );
  const router = useRouter();
  const [editing, setEditing] = useState<Reservation | "new" | null>(null);
  const [pending, start] = useTransition();
  const [rowError, setRowError] = useState<string | null>(null);

  const rows = day.reservations;
  const booked = rows.filter((r) => r.status === "booked" && r.tableId);
  const waiting = rows.filter((r) => r.status === "booked" && !r.tableId);
  const others = rows.filter((r) => r.status !== "booked");
  const active = rows.filter((r) => r.status === "booked" || r.status === "seated");
  const guests = active.reduce((n, r) => n + r.partySize, 0);
  const href = (d: string) => (d === today ? "/reservations" : `/reservations?date=${d}`);

  function setStatus(r: Reservation, status: ReservationStatus) {
    setRowError(null);
    start(async () => {
      const result = await setReservationStatusAction(r.id, status);
      if (!result.ok) setRowError(t(errorKey(result.error)));
      else {
        setEditing(null);
        router.refresh();
      }
    });
  }

  const row = (r: Reservation, muted = false) => (
    <li key={r.id} className={cn("flex items-center gap-3 px-4 py-3", muted && "text-muted-foreground")}>
      <button
        type="button"
        disabled={!canManage || r.status !== "booked"}
        onClick={() => setEditing(r)}
        className="-my-1 flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 text-left enabled:hover:bg-muted/60 disabled:cursor-default"
      >
        <span className="w-[4.75rem] shrink-0 text-[15px] font-bold text-foreground tabular-nums">{time(r.startsAt)}</span>
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-[15px] font-semibold", !muted && "text-foreground")}>{r.name}</span>
          <span className="flex items-center gap-2 text-[13px] text-muted-foreground tabular-nums">
            <span className="inline-flex items-center gap-1">
              <Icon name="users" className="size-3.5" />
              {r.partySize}
            </span>
            <span className="truncate">{r.phone}</span>
          </span>
        </span>
      </button>
      {r.tableLabel ? (
        <span className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-[13px] font-bold text-primary-foreground">
          {r.tableLabel}
        </span>
      ) : r.status === "booked" ? (
        <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[12px] font-semibold text-amber-800 ring-1 ring-amber-200">
          {t("noTable")}
        </span>
      ) : null}
      {r.status === "booked" ? (
        canManage && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus(r, "seated")} className="shrink-0">
            <Icon name="check" className="size-4" />
            {t("seat")}
          </Button>
        )
      ) : (
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold ring-1 ring-inset", STATUS_TONE[r.status])}>
          {t(`status.${r.status}`)}
        </span>
      )}
    </li>
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold tracking-tight sm:text-[26px]">{t("title")}</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">{canManage ? t("lead") : t("leadReadOnly")}</p>
        </div>
        {canManage && (
          <Button onClick={() => setEditing("new")} className="shrink-0">
            <Icon name="plus" className="size-4" />
            {t("add")}
          </Button>
        )}
      </header>

      {/* The day: previous / pick / next, and what it holds. */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-2 py-2 sm:px-3">
        <div className="flex items-center gap-1">
          <Link
            href={href(shiftDay(date, -1))}
            aria-label={t("prevDay")}
            className="flex size-11 items-center justify-center rounded-lg hover:bg-muted"
          >
            <Icon name="back" className="size-5" />
          </Link>
          <label className="relative flex h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-[15px] font-semibold hover:bg-muted">
            <Icon name="calendar" className="size-4 text-muted-foreground" />
            {dayName}
            <input
              type="date"
              aria-label={t("date")}
              value={date}
              onChange={(e) => e.target.value && router.push(href(e.target.value))}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          <Link
            href={href(shiftDay(date, 1))}
            aria-label={t("nextDay")}
            className="flex size-11 items-center justify-center rounded-lg hover:bg-muted"
          >
            <Icon name="go" className="size-5" />
          </Link>
          {date !== today && (
            <Link href="/reservations" className="ml-1 rounded-lg px-3 py-2 text-[14px] font-medium ring-1 ring-border hover:bg-muted">
              {t("today")}
            </Link>
          )}
        </div>
        <p className="px-2 text-[13.5px] text-muted-foreground tabular-nums">
          {active.length === 0 ? t("summaryNone") : t("summary", { bookings: active.length, guests })}
        </p>
      </div>

      {rowError && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[13.5px] text-red-700">
          {rowError}
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon="calendar"
          title={t("emptyTitle")}
          body={canManage ? t("emptyBody") : undefined}
          className="mt-4 rounded-xl border border-dashed"
          action={
            canManage ? (
              <Button variant="outline" onClick={() => setEditing("new")}>
                <Icon name="plus" className="size-4" />
                {t("add")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="overflow-hidden rounded-xl border bg-card">
            <h2 className="border-b px-4 py-3 text-[14px] font-semibold">{t("booked")}</h2>
            {booked.length === 0 ? (
              <p className="px-4 py-4 text-[13.5px] text-muted-foreground">{t("noneBooked")}</p>
            ) : (
              <ul className="divide-y">{booked.map((r) => row(r))}</ul>
            )}
            {others.length > 0 && (
              <>
                <h3 className="border-y bg-muted/40 px-4 py-2 text-[12.5px] font-semibold text-muted-foreground">{t("others")}</h3>
                <ul className="divide-y">{others.map((r) => row(r, true))}</ul>
              </>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-baseline justify-between gap-2 border-b px-4 py-3">
              <h2 className="text-[14px] font-semibold">{t("waitlist")}</h2>
              {waiting.length > 0 && <span className="text-[13px] font-semibold tabular-nums">{waiting.length}</span>}
            </div>
            {waiting.length === 0 ? (
              <p className="px-4 py-4 text-[13.5px] text-muted-foreground">{t("noneWaiting")}</p>
            ) : (
              <ul className="divide-y">{waiting.map((r) => row(r))}</ul>
            )}
            <p className="border-t px-4 py-2.5 text-[12.5px] text-muted-foreground">{t("waitlistLead")}</p>
          </section>
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? t("newTitle") : t("editTitle")}</DialogTitle>
            <DialogDescription>{t("formLead")}</DialogDescription>
          </DialogHeader>
          {editing && (
            <ReservationForm
              key={editing === "new" ? "new" : editing.id}
              initial={editing === "new" ? null : editing}
              defaultWhen={date === today ? nextHalfHour() : `${date}T19:00`}
              areas={areas}
              pending={pending}
              onStatus={(status) => editing !== "new" && setStatus(editing, status)}
              onSaved={() => {
                setEditing(null);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function ReservationForm({
  initial,
  defaultWhen,
  areas,
  pending,
  onStatus,
  onSaved,
}: {
  initial: Reservation | null;
  defaultWhen: string;
  areas: Area[];
  pending: boolean;
  onStatus: (status: ReservationStatus) => void;
  onSaved: () => void;
}) {
  const t = useTranslations("reservations");
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [party, setParty] = useState(initial?.partySize ?? 2);
  const [when, setWhen] = useState(initial ? dhakaInput(initial.startsAt) : defaultWhen);
  const [tableId, setTableId] = useState(initial?.tableId ?? "");
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const field = "h-12 w-full rounded-lg border border-input bg-white px-3 text-[15px] outline-none focus:border-zinc-500";

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const startsAt = fromDhakaInput(when);
    startSave(async () => {
      const result = await saveReservationAction(initial?.id ?? null, {
        name: name.trim(),
        phone: phone.trim(),
        partySize: party,
        tableId: tableId || null,
        // Editing: send the time only when it changed, so an older booking can still be edited.
        ...((!initial || startsAt !== new Date(initial.startsAt).toISOString()) && { startsAt }),
      });
      if (result.ok) onSaved();
      else setError(t(errorKey(result.error)));
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label className="grid gap-1.5 text-[13.5px] font-medium">
        {t("name")}
        <input required maxLength={80} autoFocus value={name} onChange={(e) => setName(e.target.value)} className={field} />
      </label>
      <label className="grid gap-1.5 text-[13.5px] font-medium">
        {t("phone")}
        <input
          required
          inputMode="tel"
          placeholder="01XXXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={cn(field, "tabular-nums")}
        />
      </label>
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <div className="grid gap-1.5 text-[13.5px] font-medium">
          <span id="res-party">{t("party")}</span>
          <div role="group" aria-labelledby="res-party" className="flex h-12 items-center rounded-lg border border-input bg-white">
            <button
              type="button"
              aria-label={t("fewer")}
              disabled={party <= 1}
              onClick={() => setParty((n) => Math.max(1, n - 1))}
              className="flex size-12 items-center justify-center rounded-l-lg hover:bg-muted disabled:opacity-40"
            >
              <Icon name="minus" className="size-4" />
            </button>
            <span className="w-8 text-center text-[16px] font-bold tabular-nums" aria-live="polite">
              {party}
            </span>
            <button
              type="button"
              aria-label={t("more")}
              disabled={party >= 50}
              onClick={() => setParty((n) => Math.min(50, n + 1))}
              className="flex size-12 items-center justify-center rounded-r-lg hover:bg-muted disabled:opacity-40"
            >
              <Icon name="plus" className="size-4" />
            </button>
          </div>
        </div>
        <label className="grid min-w-0 gap-1.5 text-[13.5px] font-medium">
          {t("time")}
          <input type="datetime-local" required value={when} onChange={(e) => setWhen(e.target.value)} className={field} />
        </label>
      </div>
      <label className="grid gap-1.5 text-[13.5px] font-medium">
        {t("table")}
        <select value={tableId} onChange={(e) => setTableId(e.target.value)} className={field}>
          <option value="">{t("noTableOption")}</option>
          {areas.map((area) => (
            <optgroup key={area.id} label={area.name}>
              {area.tables.map((table) => (
                <option key={table.id} value={table.id} disabled={table.seats < party}>
                  {t("tableOption", { label: table.label, seats: table.seats })}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[13.5px] text-red-700">
          {error}
        </p>
      )}
      <Button type="submit" disabled={saving || pending} className="w-full font-semibold">
        {saving ? t("saving") : t("save")}
      </Button>
      {initial && (
        <div className="grid grid-cols-3 gap-2 border-t pt-4">
          <Button type="button" variant="success" size="sm" disabled={pending || saving} onClick={() => onStatus("seated")}>
            {t("seat")}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={pending || saving} onClick={() => onStatus("no_show")}>
            {t("noShow")}
          </Button>
          <Button type="button" variant="destructive" size="sm" disabled={pending || saving} onClick={() => onStatus("cancelled")}>
            {t("cancel")}
          </Button>
        </div>
      )}
    </form>
  );
}
