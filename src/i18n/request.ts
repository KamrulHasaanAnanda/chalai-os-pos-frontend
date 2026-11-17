import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALE_COOKIE, type Locale } from "./locale";

// English or Bangla. Staff pick it with the "বাংলা" / "English" button (a cookie on this device); without one, a device
// set to Bangla gets Bangla. The static demo build can't read cookies or headers, so it stays English.
const staticExport = process.env.CHALAI_DEMO === "1" && process.env.CHALAI_STATIC_EXPORT === "1";

async function requestLocale(): Promise<Locale> {
  if (staticExport) return "en";
  try {
    const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
    if (chosen === "bn" || chosen === "en") return chosen;
    const accept = (await headers()).get("accept-language") ?? "";
    return /^\s*bn\b/i.test(accept) ? "bn" : "en";
  } catch {
    return "en"; // outside a request (build time)
  }
}

export default getRequestConfig(async () => {
  const locale = await requestLocale();
  return { locale, messages: (await import(`../../messages/${locale}.json`)).default };
});
