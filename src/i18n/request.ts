import { getRequestConfig } from "next-intl/server";

/** English only for now, like the marketing site. Add bn here and a locale cookie when Bangla strings exist. */
export default getRequestConfig(async () => ({
  locale: "en",
  messages: (await import("../../messages/en.json")).default,
}));
