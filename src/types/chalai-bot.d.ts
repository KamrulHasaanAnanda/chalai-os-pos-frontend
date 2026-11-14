// The part of the Chalai bot's script API (../chalai-bot/src/types.ts) this app uses.
// The script puts it on `window.ChalaiBot` when it loads.

export type BotLocale = "en" | "bn";

export type BotQuestion = { text: string; intent?: string };

export type BotReply = {
  lines: string[];
  list?: string[];
  link?: { href: string; label: string };
};

export type Brain = (
  question: BotQuestion,
  context: { locale: BotLocale },
) => BotReply | Promise<BotReply>;

export type BotOptions = {
  answer: Brain;
  locale?: BotLocale;
  title?: string;
  subtitle?: string;
  greeting?: string;
  note?: string;
  suggestions?: { label: string; intent?: string }[];
  onNavigate?: (href: string) => void;
  side?: "left" | "right";
  offset?: number;
  accent?: string;
  zIndex?: number;
  container?: HTMLElement;
};

export type ChalaiBot = {
  open(): void;
  close(): void;
  update(options: Partial<BotOptions>): void;
  reset(): void;
  destroy(): void;
};

export type ChalaiBotApi = {
  mount(options: BotOptions): ChalaiBot;
  version: string;
};

declare global {
  interface Window {
    ChalaiBot?: ChalaiBotApi;
  }
}
