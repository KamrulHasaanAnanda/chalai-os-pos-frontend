import { getTranslations } from "next-intl/server";

/**
 * Forms report errors by redirecting back with ?error=code (and ?field= for one input),
 * so they work as plain HTML posts. ?form= names the form when a page has several.
 */
export async function readError(searchParams: Promise<Record<string, string | string[] | undefined>>) {
  const params = await searchParams;
  const t = await getTranslations("errors");
  const code = typeof params.error === "string" ? params.error : undefined;
  const field = typeof params.field === "string" ? params.field : undefined;
  const form = typeof params.form === "string" ? params.form : undefined;
  const message = code ? (t.has(code as "unknown") ? t(code as "unknown") : t("unknown")) : undefined;
  return {
    message,
    /** The message for one input, on pages with a single main form. */
    for: (name: string) => (field === name ? message : undefined),
    /** The message for one of several small forms on a page, shown at that form. */
    forForm: (name: string) => (form === name ? message : undefined),
    /** The message when it isn't tied to a form or an input. */
    general: form || field ? undefined : message,
    /** Changes on every action redirect; dialogs reopen on errors / close on success when it changes. */
    stamp: typeof params.at === "string" ? params.at : undefined,
    param: (name: string) => (typeof params[name] === "string" ? (params[name] as string) : undefined),
  };
}
