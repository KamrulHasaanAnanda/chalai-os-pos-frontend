"use client";
// Client component: a shadcn Dialog for confirmations and the manager-approval form. It reopens itself when
// the server sends back an error for its form, and closes after a successful action redirect.
import { useState, type ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog as ShadcnDialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { VariantProps } from "class-variance-authority";

export type ButtonStyle = VariantProps<typeof buttonVariants>;

export function Dialog({
  trigger,
  triggerStyle,
  triggerClassName,
  title,
  description,
  children,
  open = false,
  stamp,
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
  /** Kept for callers; shadcn's close button carries its own label. */
  closeLabel?: string;
}) {
  const [isOpen, setOpen] = useState(open);
  // Follow the server: each new response (stamp) decides whether the dialog is open.
  const [seen, setSeen] = useState(`${open}:${stamp}`);
  if (seen !== `${open}:${stamp}`) {
    setSeen(`${open}:${stamp}`);
    setOpen(open);
  }

  return (
    <ShadcnDialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          {...triggerStyle}
          className={triggerClassName}
        >
          {trigger}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </ShadcnDialog>
  );
}
