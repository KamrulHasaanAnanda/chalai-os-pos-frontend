import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { logout } from "@/actions/auth";
import { AuthCard } from "@/components/auth-card";
import { SubmitButton } from "@/components/ui/submit-button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("noPlan");
  return { title: t("title") };
}

/** Shown when the restaurant's plan has no `pos` / `kitchen` module (403 module_not_in_plan), or it is suspended. */
export default async function NoPlanPage({ searchParams }: PageProps<"/no-plan">) {
  const t = await getTranslations("noPlan");
  const tCommon = await getTranslations("common");
  const suspended = (await searchParams).reason === "suspended";

  return (
    <AuthCard title={suspended ? t("suspendedTitle") : t("title")} body={suspended ? t("suspendedBody") : t("body")}>
      <form action={logout}>
        <SubmitButton variant="secondary" size="lg" block>
          {tCommon("logout")}
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
