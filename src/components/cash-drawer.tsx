"use client";
// Client component: the Open drawer button in the POS top bar (cashiers, managers, the owner), shown when the owner
// turned the cash drawer on. The first time on a tablet it connects the USB receipt printer the drawer is plugged
// into; after that it opens the drawer and logs who pressed it and why. The log goes through the offline outbox, so
// a press with no internet is uploaded later with its own time.

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { connectPrinter, forgetPrinter, openDrawer, setDrawerEnabled, useDrawer } from "@/lib/drawer";
import { enqueue } from "@/lib/offline/outbox";
import { cn } from "@/lib/utils";

/** Tells the drawer module the owner's setting, so cash payments and cash in / out open it. Every POS page has it. */
export function DrawerSetting({ enabled }: { enabled: boolean }) {
  useEffect(() => setDrawerEnabled(enabled), [enabled]);
  return null;
}

/** Logs an Open drawer press (online now, or uploaded later). */
export async function logDrawerOpen(reason: string, label: string) {
  const id = crypto.randomUUID();
  await enqueue({
    key: `drawer-${id}`,
    path: "/pos/drawer/opens",
    body: { id, openedAt: new Date().toISOString(), ...(reason ? { reason: reason.slice(0, 120) } : {}) },
    orderId: null,
    label,
  });
}

export function CashDrawerButton({ className }: { className?: string }) {
  const t = useTranslations("drawer");
  const drawer = useDrawer();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const supported = drawer.usb || drawer.serial;

  async function connect(kind: "usb" | "serial") {
    setBusy(true);
    setMessage(null);
    try {
      await connectPrinter(kind);
      setMessage({ ok: true, text: t("connected") });
    } catch (error) {
      const code = (error as Error).message;
      if (code !== "cancelled") setMessage({ ok: false, text: kind === "usb" ? t("usbFailed") : t("failed") });
    } finally {
      setBusy(false);
    }
  }

  async function press() {
    setBusy(true);
    setMessage(null);
    const ok = await openDrawer();
    if (ok) {
      await logDrawerOpen(reason.trim(), t("logLabel"));
      setReason("");
      setOpen(false);
    } else {
      setMessage({ ok: false, text: t("failed") });
    }
    setBusy(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMessage(null);
          setOpen(true);
        }}
        className={cn(
          "inline-flex h-10 items-center gap-1.5 rounded-md border bg-card px-3 text-[13.5px] font-semibold hover:bg-muted",
          className,
        )}
      >
        <Icon name="cash" className="size-4" />
        <span className="max-sm:sr-only">{t("button")}</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>
              {!supported ? t("unsupported") : drawer.printer ? t("printer", { name: drawer.printer }) : t("notConnected")}
            </DialogDescription>
          </DialogHeader>

          {supported && !drawer.printer && (
            <div className="grid gap-2">
              {drawer.usb && (
                <Button size="lg" disabled={busy} onClick={() => void connect("usb")}>
                  <Icon name="printer" className="size-4" />
                  {t("connectUsb")}
                </Button>
              )}
              {drawer.serial && (
                <Button size="lg" variant="outline" disabled={busy} onClick={() => void connect("serial")}>
                  {t("connectSerial")}
                </Button>
              )}
              <p className="text-[13px] text-muted-foreground">{t("connectHelp")}</p>
            </div>
          )}

          {supported && drawer.printer && (
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void press();
              }}
            >
              <label className="grid gap-1.5 text-[13.5px] font-medium">
                {t("reason")}
                <Input value={reason} maxLength={120} onChange={(e) => setReason(e.target.value)} placeholder={t("reasonPlaceholder")} autoFocus />
              </label>
              <p className="text-[13px] text-muted-foreground">{t("logged")}</p>
              <Button type="submit" size="lg" disabled={busy}>
                <Icon name="cash" className="size-4" />
                {t("open")}
              </Button>
              <button
                type="button"
                className="justify-self-start text-[13px] text-muted-foreground underline underline-offset-2"
                onClick={() => void forgetPrinter().then(() => setMessage(null))}
              >
                {t("forget")}
              </button>
            </form>
          )}

          {message && (
            <p role={message.ok ? "status" : "alert"} className={cn("text-[13.5px]", message.ok ? "text-emerald-700" : "text-red-700")}>
              {message.text}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
