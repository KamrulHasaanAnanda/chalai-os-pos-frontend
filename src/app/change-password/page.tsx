import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { changePassword, logout } from "@/actions/auth";
import { AuthCard } from "@/components/auth-card";
import { Field, Notice } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { readError } from "@/lib/errors";
import { homeFor, requireStaff } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("password");
  return { title: t("title") };
}

export default async function ChangePasswordPage({ searchParams }: PageProps<"/change-password">) {
  const { user } = await requireStaff({ passwordChange: true });
  if (!user.mustChangePassword) redirect(homeFor(user.role));

  const t = await getTranslations("password");
  const tCommon = await getTranslations("common");
  const error = await readError(searchParams);

  return (
    <AuthCard
      title={t("title")}
      body={t("body", { name: user.name })}
      footer={
        <form action={logout}>
          <SubmitButton variant="ghost">{tCommon("logout")}</SubmitButton>
        </form>
      }
    >
      <form action={changePassword} className="space-y-4">
        {error.message && <Notice>{error.message}</Notice>}
        {/* Lets password managers save the new password under the right account. */}
        <input type="hidden" name="username" autoComplete="username" value={user.username} />
        <Field name="current" type="password" label={t("current")} autoComplete="current-password" required />
        <Field name="next" type="password" label={t("next")} hint={t("nextHint")} autoComplete="new-password" minLength={8} required />
        <Field name="confirm" type="password" label={t("confirm")} autoComplete="new-password" minLength={8} required />
        <SubmitButton variant="primary" size="lg" block>
          {t("submit")}
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
