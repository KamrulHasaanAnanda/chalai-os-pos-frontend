"use client";
// Client component: opening a native <dialog> as a modal needs showModal(). Used for confirmations and the
// manager-approval form; it reopens itself when the server sends back an error for its form.

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { buttonClass, type ButtonStyle } from "./button";

export function Dialog({
  trigger,
  triggerStyle,
  triggerClassName,
  title,
  description,
  children,
  open = false,
  stamp,
  closeLabel,
}: {
  trigger: ReactNode;
  triggerStyle?: ButtonStyle;
  triggerClassName?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** True when the last server response was an error for this dialog's form. */
  open?: boolean;
  /** Changes on every action redirect (the `at` param), so the dialog closes on success and reopens on error. */
  stamp?: string;
  closeLabel: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open, stamp]);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className={cn(buttonClass({ variant: "secondary", size: "md", ...triggerStyle }), triggerClassName)}
      >
        {trigger}
      </button>
      <dialog
        ref={ref}
        aria-label={title}
        onClick={(e) => {
          // A tap on the backdrop closes it.
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="sheet m-auto w-[calc(100%-32px)] max-w-[480px] rounded-[20px] bg-white p-0 text-ink shadow-[0_24px_64px_-16px_rgb(34_19_15/0.45)] backdrop:bg-[rgb(29_18_16/0.55)] max-sm:mb-0 max-sm:w-full max-sm:max-w-full max-sm:rounded-b-none"
      >
        <div className="max-h-[85dvh] overflow-y-auto p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[20px] leading-tight font-bold">{title}</h2>
              {description && <p className="mt-1 text-[14px] text-muted-foreground">{description}</p>}
            </div>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label={closeLabel}
              className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-[#6c5d57] hover:bg-[#f6eedb]"
            >
              <Icon name="x" />
            </button>
          </div>
          <div className="mt-4">{children}</div>
        </div>
      </dialog>
    </>
  );
}
