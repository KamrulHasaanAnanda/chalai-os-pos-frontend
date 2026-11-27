"use client";
// Clock in / out on the restaurant's POS (attendance-and-payroll spec). The signed-in person clocks with one tap;
// anyone else (a cook, a cleaner) types their own mobile and PIN. Owners and managers also give salary advances
// from the drawer here.

import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { advanceStaffAction, clockAction, giveAdvanceAction, myAttendance } from "@/actions/attendance";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ClockState } from "@/lib/api/types";
import { formatTime } from "@/lib/format";

export function AttendanceBar({ isStaff, canGiveAdvance, timeZone }: { isStaff: boolean; canGiveAdvance: boolean; timeZone: string }) {
  const t = useTranslations("attendance");
  const [state, setState] = useState<ClockState | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [other, setOther] = useState(false);
  const [advance, setAdvance] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!isStaff) return;
    let live = true;
    void myAttendance().then((r) => live && r.ok && setState(r.data));
    return () => {
      live = false;
    };
  }, [isStaff]);

  const summary = (s: ClockState) =>
    s.clockedIn
      ? s.late
        ? t("inLate", { time: formatTime(s.since as string, timeZone), minutes: s.lateMinutes })
        : t("in", { time: formatTime(s.since as string, timeZone) })
      : s.firstInToday
        ? t("out", { hours: Math.floor(s.minutesToday / 60), minutes: s.minutesToday % 60 })
        : t("notIn");

  function clockSelf() {
    setError(null);
    start(async () => {
      const r = await clockAction();
      if (!r.ok) return setError(t("failed"));
      setState(r.data);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-xl bg-gradient-to-r from-orange-50/80 via-white to-white px-4 py-3 shadow-xs ring-1 ring-orange-100 sm:px-5">
      {isStaff && (
        <>
          <span className="mr-auto text-[14.5px] font-semibold" role="status">
            {state ? summary(state) : "…"}
          </span>
          <Button size="sm" variant={state?.clockedIn ? "outline" : "default"} disabled={pending || !state} onClick={clockSelf} className="h-11 rounded-xl px-5 text-[14px] font-semibold [&_svg]:size-[18px]">
            <Icon name="clockIn" />
            {state?.clockedIn ? t("clockOut") : t("clockIn")}
          </Button>
        </>
      )}
      {!isStaff && flash && <span className="mr-auto text-[14px] font-medium text-emerald-700">{flash}</span>}
      {!isStaff && !flash && <span className="mr-auto text-[14px] text-muted-foreground">{t("ownerHint")}</span>}
      <Button size="sm" variant="outline" className="h-11 rounded-xl px-4 text-[14px] font-semibold [&_svg]:size-[18px]" onClick={() => setOther(true)}>
        <Icon name="user" />
        {t("someoneElse")}
      </Button>
      {canGiveAdvance && (
        <Button size="sm" variant="outline" className="h-11 rounded-xl px-4 text-[14px] font-semibold [&_svg]:size-[18px]" onClick={() => setAdvance(true)}>
          <Icon name="wallet" />
          {t("advance")}
        </Button>
      )}
      {error && (
        <p role="alert" className="w-full text-[13px] text-red-600">
          {error}
        </p>
      )}
      {isStaff && flash && <p className="w-full text-[13px] font-medium text-emerald-700">{flash}</p>}
      <OtherDialog
        open={other}
        onClose={(message) => {
          setOther(false);
          if (message) setFlash(message);
        }}
        summary={summary}
      />
      {canGiveAdvance && (
        <AdvanceDialog
          open={advance}
          onClose={(message) => {
            setAdvance(false);
            if (message) setFlash(message);
          }}
        />
      )}
    </div>
  );
}

function OtherDialog({ open, onClose, summary }: { open: boolean; onClose: (message?: string) => void; summary: (s: ClockState) => string }) {
  const t = useTranslations("attendance");
  const [mobile, setMobile] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const r = await clockAction({ mobile: mobile.trim(), pin: pin.trim() });
      if (!r.ok) return setError(r.error === "wrong_pin" ? t("wrongPin") : t("failed"));
      setMobile("");
      setPin("");
      onClose(`${r.data.name}: ${summary(r.data)}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !pending && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-bold">{t("otherTitle")}</DialogTitle>
          <DialogDescription className="text-[14.5px]">{t("otherBody")}</DialogDescription>
        </DialogHeader>
        <form
          id="clock-other"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="grid gap-3"
        >
          <label className="grid gap-1.5 text-[14px] font-semibold">
            {t("mobile")}
            <Input inputMode="tel" autoComplete="off" value={mobile} onChange={(e) => setMobile(e.target.value)} className="h-11 text-[16px]" />
          </label>
          <label className="grid gap-1.5 text-[14px] font-semibold">
            {t("pin")}
            <Input type="password" inputMode="numeric" maxLength={4} autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value)} className="h-11 text-[16px] tracking-widest" />
          </label>
          <p className="min-h-5 text-[13px] text-red-600" role={error ? "alert" : undefined}>
            {error}
          </p>
        </form>
        <DialogFooter>
          <Button variant="outline" size="lg" onClick={() => onClose()} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button type="submit" form="clock-other" size="lg" disabled={pending || mobile.trim().length < 11 || pin.trim().length !== 4}>
            {t("clock")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdvanceDialog({ open, onClose }: { open: boolean; onClose: (message?: string) => void }) {
  const t = useTranslations("attendance");
  const [people, setPeople] = useState<{ id: string; name: string }[] | null>(null);
  const [staffId, setStaffId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const value = Number(amount.trim());

  useEffect(() => {
    if (!open || people) return;
    let live = true;
    void advanceStaffAction().then((r) => {
      if (!live) return;
      if (r.ok) {
        setPeople(r.data);
        setStaffId(r.data[0]?.id ?? "");
      } else setError(t("failed"));
    });
    return () => {
      live = false;
    };
  }, [open, people, t]);

  function submit() {
    setError(null);
    start(async () => {
      const r = await giveAdvanceAction(staffId, value, note.trim());
      if (!r.ok) {
        return setError(
          r.error === "no_open_shift" ? t("noShift") : r.error === "payroll_paid" ? t("monthPaid") : r.error === "bad_amount" ? t("badAmount") : t("failed"),
        );
      }
      const name = people?.find((p) => p.id === staffId)?.name ?? "";
      setAmount("");
      setNote("");
      onClose(t("advanceDone", { name, amount: value }));
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !pending && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-bold">{t("advanceTitle")}</DialogTitle>
          <DialogDescription className="text-[14.5px]">{t("advanceBody")}</DialogDescription>
        </DialogHeader>
        <form
          id="advance-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="grid gap-3"
        >
          <label className="grid gap-1.5 text-[14px] font-semibold">
            {t("who")}
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="h-11 rounded-lg bg-background px-3 text-[15px] ring-1 ring-input">
              {(people ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-[14px] font-semibold">
            {t("amount")}
            <Input inputMode="numeric" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-11 text-[16px] tabular-nums" />
          </label>
          <label className="grid gap-1.5 text-[14px] font-semibold">
            {t("note")}
            <Input maxLength={120} autoComplete="off" value={note} onChange={(e) => setNote(e.target.value)} className="h-11 text-[15px]" />
          </label>
          <p className="min-h-5 text-[13px] text-red-600" role={error ? "alert" : undefined}>
            {error}
          </p>
        </form>
        <DialogFooter>
          <Button variant="outline" size="lg" onClick={() => onClose()} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button type="submit" form="advance-form" size="lg" disabled={pending || !staffId || !(value >= 1)}>
            {t("giveAdvance")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
