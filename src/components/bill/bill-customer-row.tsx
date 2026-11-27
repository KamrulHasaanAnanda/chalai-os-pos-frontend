"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { CustomerFields } from "@/components/customer-fields";
import { Icon } from "@/components/icons";
import { PAY_FORM_ID } from "@/components/payment-form";
import type { Order } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export function BillCustomerRow({
  order,
  payable,
}: {
  order: Order;
  payable: boolean;
}) {
  const t = useTranslations("bill");
  const [open, setOpen] = useState(
    Boolean(order.guestPhone || order.guestName || order.customer),
  );
  const label = order.guestName || order.customer?.name || t("walkIn");
  const meta = [label, order.guestPhone].filter(Boolean).join(" · ");

  return (
    <section aria-label={t("customer")} className="shrink-0 border-b px-4 py-2.5 sm:px-5">
      <button
        type="button"
        className="flex min-h-11 w-full items-center gap-2 rounded-lg px-1 text-left transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500/25"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="users" className="size-4 shrink-0 text-zinc-500" aria-hidden />
        <span className="min-w-0 flex-1 text-[14px] font-semibold">
          {open && payable ? (
            <span className="text-muted-foreground">{t("customer")}</span>
          ) : (
            meta || t("walkInCustomer")
          )}
        </span>
        {!open && payable ? (
          <span className="text-[13px] font-semibold text-primary">{t("addCustomer")}</span>
        ) : null}
        <Icon
          name="go"
          className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-90")}
          aria-hidden
        />
      </button>
      {open && payable ? (
        <div className="pt-2 pb-1">
          <CustomerFields
            orderId={order.id}
            formId={PAY_FORM_ID}
            initialName={order.guestName ?? order.customer?.name ?? ""}
            initialPhone={order.guestPhone ?? ""}
            attached={order.customer ?? null}
            stacked
          />
        </div>
      ) : null}
    </section>
  );
}