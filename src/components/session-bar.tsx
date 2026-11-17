"use client";
// The work-session strip in the dark Floor hero. Starting the day is a button on the strip, not a dialog. Ending it
// asks for the cash counted in the drawer, then shows the shift report the API made.
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { moveCash, shiftSoFar } from "@/actions/shifts";
import type { PaymentMethod, ShiftReport } from "@/lib/api/types";
import {
  clockTime,
  endWorkSession,
  startWorkSession,
  useSessionMinutes,
  useWorkSession,
  type WorkSession,
} from "@/lib/work-session";
import { cn } from "@/lib/utils";

export function useDuration() {
  const t = useTranslations("session");
  return (minutes: number) =>
    minutes < 60
      ? t("minutes", { n: minutes })
      : t("hours", { h: Math.floor(minutes / 60), m: minutes % 60 });
}

/** ৳1,155 or ৳70.50: shift money keeps its paisa. */
const money = (taka: number) =>
  `৳${new Intl.NumberFormat("en-IN", { minimumFractionDigits: Number.isInteger(taka) ? 0 : 2, maximumFractionDigits: 2 }).format(taka)}`;

export function SessionBar({ userId }: { userId: string; userName: string }) {
  const t = useTranslations("session");
  const session = useWorkSession(userId);
  const minutes = useSessionMinutes(session);
  const duration = useDuration();
  const [ending, setEnding] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(false);
  const [report, setReport] = useState<ShiftReport | null>(null);
  const [soFar, setSoFar] = useState<ShiftReport | null>(null);
  const [soFarError, setSoFarError] = useState(false);
  const [moving, setMoving] = useState(false);
  const [opening, setOpening] = useState("");
  const openingValue = opening.trim() === "" ? null : Number(opening.trim());
  const openingInvalid = openingValue !== null && (!Number.isFinite(openingValue) || openingValue < 0);

  if (session === "pending")
    return (
      <div
        className="h-[68px] rounded-xl bg-white/5 ring-1 ring-white/10"
        aria-hidden
      />
    );

  async function start() {
    if (openingInvalid) return;
    setStarting(true);
    setStartError(false);
    const failed = (await startWorkSession(userId, openingValue)) !== null;
    setStartError(failed);
    if (!failed) setOpening("");
    setStarting(false);
  }

  async function showSoFar() {
    setSoFarError(false);
    const result = await shiftSoFar();
    if (result.ok) setSoFar(result.data);
    else setSoFarError(true);
  }

  return (
    <>
      <div
        className={cn(
          "flex flex-col gap-3 rounded-xl p-3 ring-1 sm:flex-row sm:items-center sm:p-3.5",
          session
            ? "bg-emerald-500/10 ring-emerald-400/25"
            : "bg-amber-400/10 ring-amber-300/25",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            aria-hidden
            className={cn(
              "relative flex size-10 shrink-0 items-center justify-center rounded-lg text-white",
              session ? "bg-emerald-600" : "bg-amber-500",
            )}
          >
            <Icon name={session ? "timer" : "play"} className="size-5" />
            {session && (
              <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-zinc-900 bg-emerald-400" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-[14.5px] font-semibold">
              {session
                ? t("open", { time: clockTime(session.startedAt) })
                : t("closed")}
            </p>
            <p
              className={cn(
                "truncate text-[12.5px]",
                startError ? "text-red-300" : "text-zinc-400",
              )}
            >
              {startError
                ? t("startFailed")
                : soFarError
                  ? t("reportFailed")
                  : session
                  ? t("openDetail", {
                      duration: duration(minutes),
                      name: session.by,
                    })
                  : t("closedDetail")}
            </p>
          </div>
        </div>
        {session ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setMoving(true)}
              className="h-10 rounded-lg border-white/20 bg-transparent px-3 font-semibold text-white hover:bg-white/10 hover:text-white"
            >
              {t("moveCash")}
            </Button>
            <Button
              variant="outline"
              onClick={() => void showSoFar()}
              className="h-10 rounded-lg border-white/20 bg-transparent px-3 font-semibold text-white hover:bg-white/10 hover:text-white"
            >
              {t("soFar")}
            </Button>
            <Button
              variant="outline"
              onClick={() => setEnding(true)}
              className="h-10 rounded-lg border-white/20 bg-transparent px-4 font-semibold text-white hover:bg-white/10 hover:text-white"
            >
              <Icon name="stop" />
              {t("end")}
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(ev) => {
              ev.preventDefault();
              void start();
            }}
            className="flex items-center gap-2"
          >
            <label className="sr-only" htmlFor="opening-cash">
              {t("openingLabel")}
            </label>
            <input
              id="opening-cash"
              inputMode="decimal"
              autoComplete="off"
              value={opening}
              onChange={(ev) => setOpening(ev.target.value)}
              placeholder={t("openingLabel")}
              title={openingInvalid ? t("openingInvalid") : t("openingLabel")}
              aria-invalid={openingInvalid || undefined}
              className="h-10 w-44 rounded-lg bg-white/10 px-3 text-[14px] text-white tabular-nums ring-1 ring-white/15 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-amber-300 aria-invalid:ring-red-400"
            />
            <Button
              type="submit"
              disabled={starting || openingInvalid}
              className="h-10 rounded-lg bg-amber-400 px-4 font-semibold text-zinc-900 hover:bg-amber-300"
            >
              <Icon name="play" />
              {t("start")}
            </Button>
          </form>
        )}
      </div>

      {session && (
        <EndSessionDialog
          open={ending}
          session={session}
          minutes={minutes}
          title={t("endTitle")}
          body={t("endBody")}
          confirm={t("end")}
          onCancel={() => setEnding(false)}
          onConfirm={async (counted) => {
            const result = await endWorkSession(userId, counted);
            if ("error" in result) return result.error;
            setEnding(false);
            setReport(result.report);
            return null;
          }}
        />
      )}
      <ShiftReportDialog
        report={report}
        closeLabel={t("done")}
        onClose={() => setReport(null)}
      />
      <ShiftReportDialog
        report={soFar}
        soFar
        closeLabel={t("done")}
        onClose={() => setSoFar(null)}
      />
      <CashMoveDialog open={moving} onClose={() => setMoving(false)} />
    </>
  );
}

/** Cash put into or taken out of the drawer during the shift, with a reason. */
function CashMoveDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("session");
  const [direction, setDirection] = useState<"in" | "out">("out");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = Number(amount.trim());
  const valid = Number.isInteger(value) && value > 0 && reason.trim() !== "";

  async function submit() {
    if (!valid) {
      setError(t("moveInvalid"));
      return;
    }
    setBusy(true);
    setError(null);
    const result = await moveCash(direction, value, reason.trim());
    setBusy(false);
    if (!result.ok) {
      setError(
        result.error === "day_closed"
          ? t("dayClosed")
          : result.error === "no_open_shift"
            ? t("alreadyEnded")
            : result.error === "bad_amount"
              ? t("moveInvalid")
              : t("moveFailed"),
      );
      return;
    }
    setAmount("");
    setReason("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-[22px] font-bold">{t("moveTitle")}</DialogTitle>
          <DialogDescription className="text-[14.5px]">{t("moveBody")}</DialogDescription>
        </DialogHeader>
        <form
          id="cash-move-form"
          onSubmit={(ev) => {
            ev.preventDefault();
            void submit();
          }}
          className="grid gap-3"
        >
          <div role="radiogroup" className="grid grid-cols-2 gap-2">
            {(["out", "in"] as const).map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={direction === d}
                onClick={() => setDirection(d)}
                className={cn(
                  "h-11 rounded-lg text-[14.5px] font-semibold ring-1",
                  direction === d ? "bg-zinc-900 text-white ring-zinc-900" : "bg-background ring-border hover:bg-muted",
                )}
              >
                {d === "in" ? t("moveIn") : t("moveOut")}
              </button>
            ))}
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="move-amount" className="text-[14px] font-semibold">
              {t("moveAmount")}
            </label>
            <Input
              id="move-amount"
              inputMode="numeric"
              autoComplete="off"
              placeholder="৳0"
              value={amount}
              onChange={(ev) => setAmount(ev.target.value)}
              className="h-11 text-[16px] tabular-nums"
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="move-reason" className="text-[14px] font-semibold">
              {t("moveReason")}
            </label>
            <Input
              id="move-reason"
              maxLength={120}
              autoComplete="off"
              placeholder={t("moveReasonPlaceholder")}
              value={reason}
              onChange={(ev) => setReason(ev.target.value)}
              className="h-11 text-[15px]"
            />
          </div>
          <p className="min-h-5 text-[12.5px] text-red-600" role={error ? "alert" : undefined}>
            {error}
          </p>
        </form>
        <DialogFooter>
          <Button variant="outline" size="lg" onClick={onClose} disabled={busy}>
            {t("keepOpen")}
          </Button>
          <Button
            type="submit"
            form="cash-move-form"
            size="lg"
            disabled={busy}
            className="bg-zinc-900 font-semibold text-white hover:bg-zinc-800"
          >
            {t("moveSave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Shared by the Floor bar and the logout button: when it started, how long, the cash count and the confirm button.
 * `onConfirm` gets the counted cash (null when left empty) and answers an error code, or null when it worked.
 */
export function EndSessionDialog({
  open,
  session,
  minutes,
  title,
  body,
  confirm,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  session: WorkSession;
  minutes: number;
  title: string;
  body: string;
  confirm: string;
  onCancel: () => void;
  onConfirm: (countedCashTaka: number | null) => Promise<string | null>;
}) {
  const t = useTranslations("session");
  const duration = useDuration();
  const [cash, setCash] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = cash.trim();
  const counted = trimmed === "" ? null : Number(trimmed);
  const invalid = counted !== null && (!Number.isFinite(counted) || counted < 0);

  async function submit() {
    if (invalid) return;
    setBusy(true);
    setError(null);
    const failed = await onConfirm(counted);
    setBusy(false);
    if (failed) setError(failed === "no_open_shift" ? t("alreadyEnded") : t("endFailed"));
    else setCash("");
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onCancel()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <span
            aria-hidden
            className="mb-1 flex size-12 items-center justify-center rounded-xl bg-zinc-900 text-white"
          >
            <Icon name="stop" className="size-5" />
          </span>
          <DialogTitle className="text-[22px] font-bold">{title}</DialogTitle>
          <DialogDescription className="text-[14.5px]">
            {body}
          </DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-2">
          {[
            [t("startedAt"), clockTime(session.startedAt)],
            [t("length"), duration(minutes)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-muted p-3">
              <dt className="text-[11.5px] font-semibold text-muted-foreground uppercase">
                {label}
              </dt>
              <dd className="mt-0.5 text-[18px] font-bold tabular-nums">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <form
          id="end-session-form"
          onSubmit={(ev) => {
            ev.preventDefault();
            void submit();
          }}
          className="grid gap-1.5"
        >
          <label htmlFor="counted-cash" className="text-[14px] font-semibold">
            {t("countLabel")}
          </label>
          <Input
            id="counted-cash"
            inputMode="decimal"
            autoComplete="off"
            placeholder="৳0"
            value={cash}
            onChange={(ev) => setCash(ev.target.value)}
            aria-invalid={invalid || undefined}
            aria-describedby="counted-cash-hint"
            className="h-11 text-[16px] tabular-nums"
          />
          <p
            id="counted-cash-hint"
            className={cn(
              "text-[12.5px]",
              invalid || error ? "text-red-600" : "text-muted-foreground",
            )}
            role={invalid || error ? "alert" : undefined}
          >
            {invalid ? t("countInvalid") : (error ?? t("countHint"))}
          </p>
        </form>
        <DialogFooter>
          <Button variant="outline" size="lg" onClick={onCancel} disabled={busy}>
            {t("keepOpen")}
          </Button>
          <Button
            type="submit"
            form="end-session-form"
            size="lg"
            disabled={busy || invalid}
            className="bg-zinc-900 font-semibold text-white hover:bg-zinc-800"
          >
            <Icon name="stop" />
            {confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const METHODS: PaymentMethod[] = ["cash", "bkash", "nagad", "card"];

/** The report the API made when the shift ended. */
export function ShiftReportDialog({
  report,
  soFar = false,
  closeLabel,
  onClose,
}: {
  report: ShiftReport | null;
  /** The X-report: the shift is still open. */
  soFar?: boolean;
  closeLabel: string;
  onClose: () => void;
}) {
  const t = useTranslations("session");
  const tMethod = useTranslations("paymentMethod");
  const duration = useDuration();
  if (!report) return null;
  const diff = report.cash.differenceTaka;

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-[22px] font-bold">
            {soFar ? t("soFarTitle") : t("reportTitle")}
          </DialogTitle>
          {soFar && (
            <p className="rounded-md bg-amber-50 px-2.5 py-1.5 text-[13px] font-medium text-amber-800">
              {t("soFarNote")}
            </p>
          )}
          <DialogDescription className="text-[14px]">
            {t("reportFor", {
              who: report.branchName
                ? `${report.staffName}, ${report.branchName}`
                : report.staffName,
              start: clockTime(report.startedAt),
              end: clockTime(report.endedAt),
              duration: duration(report.minutes),
            })}
          </DialogDescription>
        </DialogHeader>

        <section aria-labelledby="report-money" className="grid gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <h3 id="report-money" className="text-[14px] font-semibold">
              {t("moneyTaken")}
            </h3>
            <span className="text-[24px] font-bold tabular-nums">
              {money(report.payments.totalTaka)}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {METHODS.map((m) => (
              <div key={m} className="rounded-lg bg-muted p-2.5">
                <dt className="text-[12px] font-medium text-muted-foreground">
                  {tMethod(m)}
                </dt>
                <dd className="mt-0.5 text-[15px] font-bold tabular-nums">
                  {money(report.payments.byMethod[m])}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-[13px] text-muted-foreground">
            {t("paymentsCount", {
              n: report.payments.count,
              orders: report.ordersClosed,
            })}
          </p>
        </section>

        <section
          aria-labelledby="report-cash"
          className="grid gap-1.5 rounded-lg border p-3"
        >
          <h3 id="report-cash" className="text-[14px] font-semibold">
            {t("cashDrawer")}
          </h3>
          {report.cash.openingTaka !== undefined && (
            <Row label={t("cashOpening")} value={money(report.cash.openingTaka)} />
          )}
          {(report.cash.movements ?? []).map((m, i) => (
            <Row
              key={i}
              label={`${m.direction === "in" ? t("cashIn") : t("cashOut")} · ${m.reason}`}
              value={`${m.direction === "in" ? "+" : "−"}${money(m.amountTaka)}`}
            />
          ))}
          <Row label={t("cashExpected")} value={money(report.cash.expectedTaka)} />
          <Row
            label={t("cashCounted")}
            value={
              report.cash.countedTaka === null
                ? t("notCounted")
                : money(report.cash.countedTaka)
            }
          />
          {diff !== null && (
            <p
              className={cn(
                "mt-1 rounded-md px-2.5 py-1.5 text-[14px] font-semibold",
                diff === 0
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-red-50 text-red-700",
              )}
            >
              {diff === 0
                ? t("cashMatches")
                : diff < 0
                  ? t("cashShort", { amount: money(-diff) })
                  : t("cashOver", { amount: money(diff) })}
            </p>
          )}
        </section>

        {(report.cancelled.orders.length > 0 ||
          report.cancelled.dishes.length > 0) && (
          <section aria-labelledby="report-cancelled" className="grid gap-1.5">
            <h3 id="report-cancelled" className="text-[14px] font-semibold">
              {t("cancelledTitle")}
            </h3>
            <ul className="grid gap-1 text-[13.5px]">
              {report.cancelled.orders.map((o) => (
                <li key={`o${o.number}`}>
                  {t("cancelledOrder", { n: o.number })}
                  {o.reason && (
                    <span className="text-muted-foreground"> · {o.reason}</span>
                  )}
                </li>
              ))}
              {report.cancelled.dishes.map((d, i) => (
                <li key={`d${i}`}>
                  {d.quantity} × {d.name}
                  {d.reason && (
                    <span className="text-muted-foreground"> · {d.reason}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="report-open" className="grid gap-1.5">
          <h3 id="report-open" className="text-[14px] font-semibold">
            {t("openTablesTitle")}
          </h3>
          {report.openTables.length === 0 ? (
            <p className="text-[13.5px] text-muted-foreground">
              {t("noOpenTables")}
            </p>
          ) : (
            <ul className="grid gap-1 text-[13.5px]">
              {report.openTables.map((o) => (
                <li key={o.number} className="flex justify-between gap-3">
                  <span>
                    {o.label
                      ? t("openTable", { table: o.label, n: o.number })
                      : t("orderNo", { n: o.number })}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {t("due", { amount: money(o.dueTaka) })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <DialogFooter>
          <Button
            size="lg"
            onClick={onClose}
            className="bg-zinc-900 font-semibold text-white hover:bg-zinc-800"
          >
            {closeLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-[14px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
