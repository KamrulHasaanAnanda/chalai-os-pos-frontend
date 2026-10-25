type Params = Record<string, string | string[] | undefined>;
type ErrorMessages = { has: (key: never) => boolean; (key: never): string };

/**
 * Forms report errors by redirecting back with ?error=code (and ?field= for one input),
 * so they work as plain HTML posts. ?form= names the form when a page has several.
 * `t` is the "errors" namespace, from getTranslations (server) or useTranslations (browser).
 */
export function errorReader(params: Params, t: ErrorMessages) {
  const translate = t as unknown as { has: (key: string) => boolean; (key: string): string };
  const code = typeof params.error === "string" ? params.error : undefined;
  const field = typeof params.field === "string" ? params.field : undefined;
  const form = typeof params.form === "string" ? params.form : undefined;
  const message = code ? (translate.has(code) ? translate(code) : translate("unknown")) : undefined;
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

export type ErrorReader = ReturnType<typeof errorReader>;
