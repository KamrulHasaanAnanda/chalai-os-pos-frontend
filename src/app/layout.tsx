import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Poppins } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

// Self-hosted at build time by next/font: no request to Google from the browser.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-poppins",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: { default: t("title"), template: `%s | ${t("title")}` }, robots: { index: false } };
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={await getLocale()} className={poppins.variable}>
      <body className="min-h-dvh bg-background font-sans text-ink antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
