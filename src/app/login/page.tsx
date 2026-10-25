import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { login } from "@/actions/auth";
import { AuthCard } from "@/components/auth-card";
import { Field, Notice } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { readError } from "@/lib/errors";
import { homeFor, peekMe } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("login");
  return { title: t("title") };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const me = await peekMe();
  if (me?.restaurant) redirect(homeFor(me.user.role));

  const t = await getTranslations("login");
  const error = await readError(searchParams);

  return (
    <AuthCard title={t("title")} body={t("body")} footer={<p className="text-[13px] text-muted-foreground">{t("help")}</p>}>
      <form action={login} className="space-y-4">
        {error.message && <Notice tone={error.param("error") === "session_expired" ? "info" : "error"}>{error.message}</Notice>}
        <Field
          name="username"
          label={t("username")}
          defaultValue={error.param("username")}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          autoFocus
        />
        <Field name="password" type="password" label={t("password")} autoComplete="current-password" required />
        <SubmitButton variant="primary" size="lg" block>
          {t("submit")}
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
