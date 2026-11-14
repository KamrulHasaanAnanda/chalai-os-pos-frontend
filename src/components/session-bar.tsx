"use client";
// The work-session strip in the dark Floor hero, plus the "start your day" prompt when no session is open.
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

export function SessionBar({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const t = useTranslations("session");
  const session = useWorkSession(userId);
  const minutes = useSessionMinutes(session);
  const duration = useDuration();
  // The start prompt opens by itself when the day hasn't been started; "Not now" hides it until the next visit.
  const [dismissed, setDismissed] = useState(false);
  const [ending, setEnding] = useState(false);

  if (session === "pending")
    return (
      <div
        className="h-[68px] rounded-xl bg-white/5 ring-1 ring-white/10"
        aria-hidden
      />
    );

  const start = () => startWorkSession(userId, userName);

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
            <p className="truncate text-[12.5px] text-zinc-400">
              {session
                ? t("openDetail", {
                    duration: duration(minutes),
                    name: session.by,
                  })
                : t("closedDetail")}
            </p>
          </div>
        </div>
        {session ? (
          <Button
            variant="outline"
            onClick={() => setEnding(true)}
            className="h-10 rounded-lg border-white/20 bg-transparent px-4 font-semibold text-white hover:bg-white/10 hover:text-white"
          >
            <Icon name="stop" />
            {t("end")}
          </Button>
        ) : (
          <Button
            onClick={start}
            className="h-10 rounded-lg bg-amber-400 px-4 font-semibold text-zinc-900 hover:bg-amber-300"
          >
            <Icon name="play" />
            {t("start")}
          </Button>
        )}
      </div>

      <Dialog
        open={!session && !dismissed}
        onOpenChange={(open) => !open && setDismissed(true)}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <span
              aria-hidden
              className="mb-1 flex size-12 items-center justify-center rounded-xl bg-amber-400 text-zinc-900"
            >
              <Icon name="play" className="size-5" />
            </span>
            <DialogTitle className="text-[22px] font-bold">
              {t("startTitle", { name: userName.split(" ")[0] })}
            </DialogTitle>
            <DialogDescription className="text-[14.5px]">
              {t("startBody")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setDismissed(true)}
            >
              {t("notNow")}
            </Button>
            <Button size="lg" className="font-semibold" onClick={start}>
              <Icon name="play" />
              {t("start")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {session && (
        <EndSessionDialog
          open={ending}
          session={session}
          minutes={minutes}
          title={t("endTitle")}
          body={t("endBody")}
          confirm={t("end")}
          onCancel={() => setEnding(false)}
          onConfirm={() => {
            endWorkSession(userId);
            setEnding(false);
          }}
        />
      )}
    </>
  );
}

/** Shared by the Floor bar and the logout button: when it started, how long, and the confirm button. */
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
  onConfirm: () => void;
}) {
  const t = useTranslations("session");
  const duration = useDuration();
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
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
        <DialogFooter>
          <Button variant="outline" size="lg" onClick={onCancel}>
            {t("keepOpen")}
          </Button>
          <Button
            size="lg"
            className="bg-zinc-900 font-semibold text-white hover:bg-zinc-800"
            onClick={onConfirm}
          >
            <Icon name="stop" />
            {confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
