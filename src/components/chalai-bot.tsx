"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ASSISTANT_CHIPS, answerQuestion } from "@/lib/assistant";
import type { ChalaiBot, ChalaiBotApi } from "@/types/chalai-bot";

const BOT_URL =
  process.env.NEXT_PUBLIC_CHALAI_BOT_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:5190/chalai-bot.js" : "");

function ensureScript(url: string) {
  if (document.querySelector("script[data-chalai-bot]")) return;
  const script = document.createElement("script");
  script.src = url;
  script.defer = true;
  script.dataset.chalaiBot = "";
  document.body.appendChild(script);
}

/** Resolves once the bot script has loaded, or null if it never arrives. */
function whenBotLoaded(): Promise<ChalaiBotApi | null> {
  if (window.ChalaiBot) return Promise.resolve(window.ChalaiBot);
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), 8000);
    window.addEventListener(
      "chalai-bot:ready",
      () => {
        window.clearTimeout(timer);
        resolve(window.ChalaiBot ?? null);
      },
      { once: true },
    );
  });
}

function buttonOffset() {
  return window.matchMedia("(min-width: 768px)").matches ? 24 : 88;
}

/** Demo builds answer from this device. The real app asks the server, which holds the session. */
async function loadSnapshot() {
  if (process.env.CHALAI_DEMO === "1") {
    const { assistantSnapshot } = await import("@/demo/actions/assistant");
    return assistantSnapshot();
  }
  const { assistantSnapshot } = await import("@/actions/assistant");
  return assistantSnapshot();
}

/**
 * The Chalai bot on every signed-in POS page. The widget is a separate app (../chalai-bot);
 * this only starts it and answers from the floor, orders, kitchen and menu.
 */
export function ChalaiBotMount({ name }: { name: string }) {
  const t = useTranslations("assistant");
  const router = useRouter();
  const [bot, setBot] = useState<ChalaiBot | null>(null);
  const copy = useRef({ name, t });

  useEffect(() => {
    copy.current = { name, t };
  }, [name, t]);

  useEffect(() => {
    if (!BOT_URL) return;
    let instance: ChalaiBot | null = null;
    let cancelled = false;
    ensureScript(BOT_URL);
    void whenBotLoaded().then((api) => {
      if (cancelled || !api) return;
      instance = api.mount({
        answer: async (question) => {
          const { name: restaurant, t: translate } = copy.current;
          let snap = null;
          try {
            snap = await loadSnapshot();
          } catch {
            snap = null;
          }
          return answerQuestion(question, snap, restaurant, (key, values) =>
            translate(key as never, values as never),
          );
        },
        onNavigate: (href) => router.push(href),
        offset: buttonOffset(),
        zIndex: 60,
      });
      setBot(instance);
    });
    return () => {
      cancelled = true;
      instance?.destroy();
      setBot(null);
    };
  }, [router]);

  useEffect(() => {
    if (!bot) return;
    bot.update({
      title: t("title"),
      subtitle: t("subtitle"),
      greeting: t("greeting", { name }),
      note: process.env.CHALAI_DEMO === "1" ? t("demoNote") : t("note"),
      suggestions: ASSISTANT_CHIPS.map((intent) => ({
        label: t(`chips.${intent}`),
        intent,
      })),
    });
  }, [bot, t, name]);

  useEffect(() => {
    if (!bot) return;
    const query = window.matchMedia("(min-width: 768px)");
    const apply = () => bot.update({ offset: buttonOffset() });
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [bot]);

  return null;
}
