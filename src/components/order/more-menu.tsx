"use client";
// Client component: the ticket's "⋯" menu. Rare actions (merge into another table, cancel the order) live here,
// out of the way; each opens its form in a dialog. The forms themselves are server-rendered and passed in.

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type MoreAction = {
  id: string;
  label: string;
  icon: IconName;
  danger?: boolean;
  /** Opened at load: the server sent back an error for this form. */
  open?: boolean;
  form: ReactNode;
};

export function MoreMenu({ actions }: { actions: MoreAction[] }) {
  const t = useTranslations("order");
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<string | null>(() => actions.find((a) => a.open)?.id ?? null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  if (actions.length === 0) return null;
  const current = actions.find((a) => a.id === dialog);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={t("more")}
        title={t("more")}
        className="flex size-10 items-center justify-center rounded-lg text-zinc-600 hover:bg-muted hover:text-zinc-950 focus-visible:ring-3 focus-visible:ring-select/30 focus-visible:outline-none"
      >
        <Icon name="more" className="size-5" />
      </button>
      {menuOpen && (
        <ul
          role="menu"
          className="absolute top-full right-0 z-30 mt-1 w-60 rounded-xl border bg-popover p-1 shadow-lg"
        >
          {actions.map((a) => (
            <li key={a.id} role="none">
              <button
                type="button"
                role="menuitem"
                autoFocus={a === actions[0]}
                onClick={() => {
                  setMenuOpen(false);
                  setDialog(a.id);
                }}
                className={cn(
                  "flex h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[14px] font-medium focus-visible:bg-muted focus-visible:outline-none",
                  a.danger ? "text-red-700 hover:bg-red-50" : "text-zinc-800 hover:bg-muted",
                )}
              >
                <Icon name={a.icon} className="size-4" />
                {a.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={current !== undefined} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-[460px]">
          {current && (
            <>
              <DialogHeader>
                <DialogTitle>{current.label}</DialogTitle>
              </DialogHeader>
              {current.form}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
