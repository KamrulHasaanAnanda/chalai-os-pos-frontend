/* eslint-disable @next/next/no-img-element -- small brand SVG, no optimisation needed */
import { ChefHatIcon, LayoutGridIcon, ReceiptIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

const FEATURES = [
  { key: "featureTables", icon: LayoutGridIcon, tone: "bg-orange-500" },
  { key: "featureKitchen", icon: ChefHatIcon, tone: "bg-amber-500" },
  { key: "featureBills", icon: ReceiptIcon, tone: "bg-emerald-600" },
] as const;

/**
 * Split screen for login, password change and the plan page: a dark brand panel on the left (with `aside`, e.g. the
 * demo's staff list, drawn on the dark) and the form on white. On phones the dark panel becomes a header and the form
 * sits on a sheet that overlaps it.
 */
export function AuthCard({
  title,
  body,
  children,
  footer,
  aside,
}: {
  title: string;
  body?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  aside?: ReactNode;
}) {
  const t = useTranslations("common");
  return (
    <main className="grid min-h-dvh grid-rows-[auto_1fr] bg-zinc-900 lg:grid-rows-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:bg-card">
      <section className="relative flex flex-col overflow-hidden bg-zinc-900 px-5 pt-6 pb-12 text-white sm:px-10 lg:px-12 lg:py-12">
        {/* Soft orange glow so the panel isn't a flat slab. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-32 size-80 rounded-full bg-orange-500/20 blur-3xl"
        />
        <img
          src="/brand/logo-en-on-dark.svg"
          alt="Chalai OS"
          width={440}
          height={100}
          className="relative h-7 w-auto self-start"
        />
        <div className="relative mt-7 lg:mt-14">
          <p className="text-[26px] leading-tight font-bold tracking-tight sm:text-[30px] lg:text-[34px]">
            {t("product")}
          </p>
          <p className="mt-2 max-w-[400px] text-[14.5px] text-zinc-400 sm:text-[15.5px]">
            {t("tagline")}
          </p>
        </div>
        {aside ? (
          <div className="relative mt-6 lg:mt-10">{aside}</div>
        ) : (
          <ul className="relative mt-6 grid gap-3 sm:grid-cols-3 lg:mt-10 lg:grid-cols-1">
            {FEATURES.map(({ key, icon: FeatureIcon, tone }) => (
              <li
                key={key}
                className="flex items-center gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10"
              >
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-lg text-white ${tone}`}
                >
                  <FeatureIcon className="size-5" aria-hidden />
                </span>
                <span className="text-[14.5px] font-semibold">{t(key)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="relative mt-auto hidden pt-10 text-[12.5px] text-zinc-500 lg:block">
          chalai.app
        </p>
      </section>

      <section className="relative z-10 -mt-6 flex flex-col items-center rounded-t-[24px] bg-card px-5 pt-8 pb-10 sm:px-10 lg:mt-0 lg:justify-center lg:rounded-none lg:py-10">
        <div className="w-full max-w-[420px]">
          <h1 className="text-[24px] leading-tight font-bold tracking-tight sm:text-[28px]">
            {title}
          </h1>
          {body && (
            <p className="mt-2 text-[15px] text-muted-foreground">{body}</p>
          )}
          <div className="mt-7">{children}</div>
          {footer && (
            <div className="mt-6 rounded-xl bg-muted px-4 py-3">{footer}</div>
          )}
        </div>
      </section>
    </main>
  );
}
