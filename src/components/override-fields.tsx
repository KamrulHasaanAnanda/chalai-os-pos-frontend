import { useTranslations } from "next-intl";
import { inputClass } from "@/components/ui/input";
import type { Role } from "@/lib/api/types";
import { needsOverride } from "@/lib/roles";
import { cn } from "@/lib/utils";

/**
 * "Manager approval" inside a discount / cancel form, for cashiers and waiters only.
 * Managers and owners approve their own actions, so they never see it.
 */
export function OverrideFields({ role, idPrefix }: { role: Role; idPrefix: string }) {
  const t = useTranslations("override");
  if (!needsOverride(role)) return null;
  return (
    <fieldset className="mt-4 rounded-xl border-2 border-sun bg-sun-tint/60 p-3">
      <legend className="px-1 text-[15.5px] font-extrabold">{t("title")}</legend>
      <p className="text-[14.5px] text-muted-foreground">{t("body")}</p>
      <div className="mt-1 grid gap-2 sm:grid-cols-2">
        <label className="block text-[14.5px] font-bold" htmlFor={`${idPrefix}-ou`}>
          {t("username")}
          <input
            id={`${idPrefix}-ou`}
            name="overrideUsername"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className={cn(inputClass, "mt-1.5")}
          />
        </label>
        <label className="block text-[14.5px] font-bold" htmlFor={`${idPrefix}-op`}>
          {t("password")}
          <input id={`${idPrefix}-op`} name="overridePassword" type="password" autoComplete="off" className={cn(inputClass, "mt-1.5")} />
        </label>
      </div>
    </fieldset>
  );
}
