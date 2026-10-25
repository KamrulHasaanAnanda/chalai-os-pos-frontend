import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("error");
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-[520px] flex-col items-center justify-center px-4 text-center">
      <h1 className="font-heading text-[26px] font-extrabold">{t("notFoundTitle")}</h1>
      <p className="mt-2 text-muted-foreground">{t("notFoundBody")}</p>
      <Link href="/" className={`${buttonClass({ variant: "accent", size: "lg" })} mt-5`}>
        {t("home")}
      </Link>
    </main>
  );
}
