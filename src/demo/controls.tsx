"use client";
// Frontend-only demo: the "Demo" button in the top bar. Switch role, play a guest sending a QR order, or start over.

import { useTranslations } from "next-intl";
import { login } from "@/actions/auth";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Role } from "@/lib/api/types";
import { homeFor } from "@/lib/roles";
import { demoApi } from "./api";
import { DEMO_PASSWORD } from "./data";
import { go } from "./navigation";
import { reset } from "./store";

const roles = ["manager", "cashier", "waiter", "kitchen"] as const;

const closeDialog = (button: HTMLElement) => button.closest("dialog")?.close();

export function DemoControls({ role, dark = false }: { role: Role; dark?: boolean }) {
  const t = useTranslations("demo");
  const tRoles = useTranslations("roles");

  const guestOrder = (button: HTMLElement) => {
    const table = demoApi.guestOrder();
    closeDialog(button);
    go(`/floor?ok=guestOrder&table=${encodeURIComponent(table)}&at=${Date.now()}`);
  };

  const startOver = (button: HTMLElement) => {
    reset();
    closeDialog(button);
    go(`${homeFor(role)}?ok=reset&at=${Date.now()}`);
  };

  return (
    <Dialog
      trigger={
        <>
          <Icon name="sparkles" />
          <span className="max-sm:sr-only">{t("button")}</span>
        </>
      }
      triggerStyle={{ variant: dark ? "onDark" : "accent", size: "sm" }}
      triggerClassName="h-9"
      title={t("title")}
      description={t("body")}
      closeLabel={t("close")}
    >
      <div className="space-y-5 text-ink">
        <section>
          <h3 className="text-[15px] font-bold">{t("accounts")}</h3>
          <p className="text-[13.5px] text-muted-foreground">{t("accountsHint", { password: DEMO_PASSWORD })}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {roles.map((r) => (
              <form key={r} action={login}>
                <input type="hidden" name="username" value={r} />
                <input type="hidden" name="password" value={DEMO_PASSWORD} />
                <SubmitButton variant={r === role ? "primary" : "secondary"} block aria-current={r === role || undefined}>
                  {tRoles(r)}
                </SubmitButton>
              </form>
            ))}
          </div>
        </section>
        {role !== "kitchen" && (
          <section>
            <Button variant="accent" size="lg" block onClick={(e) => guestOrder(e.currentTarget)}>
              <Icon name="phone" />
              {t("guestOrder")}
            </Button>
            <p className="mt-1.5 text-[13.5px] text-muted-foreground">{t("guestOrderHint")}</p>
          </section>
        )}
        <Button variant="ghost" block onClick={(e) => startOver(e.currentTarget)}>
          <Icon name="refresh" />
          {t("reset")}
        </Button>
      </div>
    </Dialog>
  );
}
