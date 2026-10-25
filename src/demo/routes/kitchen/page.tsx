import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { DemoKitchen } from "@/demo/pages";

// Demo build only: copied over the server page by deploy/shared-hosting/prepare.mjs.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("kitchen");
  return { title: t("title") };
}

export default function Page() {
  return (
    <Suspense>
      <DemoKitchen />
    </Suspense>
  );
}
