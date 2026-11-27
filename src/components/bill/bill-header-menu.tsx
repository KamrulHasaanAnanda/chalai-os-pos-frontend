"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { orderHref } from "@/lib/paths";

export function BillHeaderMenu({ orderId }: { orderId: string }) {
  const t = useTranslations("bill");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-lg font-bold text-zinc-700 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500/25"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("moreActions")}
        onClick={() => setOpen((v) => !v)}
      >
        ⋯
      </button>
      {open ? (
        <ul
          role="menu"
          className="absolute top-11 right-0 z-20 min-w-[11rem] overflow-hidden rounded-lg border bg-white py-1 shadow-lg"
        >
          <li>
            <Link
              role="menuitem"
              href={orderHref(orderId, "receipt")}
              className="block px-3 py-2.5 text-[13.5px] font-medium hover:bg-zinc-50"
            >
              {t("preBillPrint")}
            </Link>
          </li>
        </ul>
      ) : null}
    </div>
  );
}