"use client";
// Client component: the Orders page's side drawer. The page renders it while ?view=<id> is in the URL; closing it
// (×, Escape, the backdrop) goes back to the list's URL. The order details inside are rendered on the server.

import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";

export function OrderDrawer({
  closeHref,
  title,
  closeLabel,
  children,
}: {
  closeHref: string;
  title: string;
  closeLabel: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const close = () => {
    setOpen(false);
    router.push(closeHref, { scroll: false });
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && close()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col bg-card shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:duration-200 motion-reduce:animate-none"
        >
          <header className="flex shrink-0 items-center gap-3 border-b px-5 py-3.5">
            <DialogPrimitive.Title className="min-w-0 flex-1 truncate text-[17px] font-bold">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label={closeLabel}
              className="flex size-10 items-center justify-center rounded-lg text-zinc-500 hover:bg-muted hover:text-zinc-900 focus-visible:ring-3 focus-visible:ring-select/30 focus-visible:outline-none"
            >
              <Icon name="x" className="size-5" />
            </DialogPrimitive.Close>
          </header>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
