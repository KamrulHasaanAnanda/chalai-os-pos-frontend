import { getTranslations } from "next-intl/server";
import { errorReader } from "@/lib/error-reader";

/** The page's error from its search params (see lib/error-reader.ts), for Server Components. */
export async function readError(searchParams: Promise<Record<string, string | string[] | undefined>>) {
  return errorReader(await searchParams, await getTranslations("errors"));
}
