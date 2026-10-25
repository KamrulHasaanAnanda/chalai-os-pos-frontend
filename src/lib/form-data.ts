import type { Override, RoundInput } from "@/lib/api/types";

/** Reading form posts. Shared by the server actions and the demo's browser versions of them. */
export const str = (formData: FormData, name: string, max = 200) => String(formData.get(name) ?? "").trim().slice(0, max);

/** Whole taka or percent; commas, spaces and ৳ are ignored. NaN when it isn't a whole number. */
export const int = (formData: FormData, name: string) => {
  const raw = str(formData, name, 12).replace(/[,\s৳]/g, "");
  return /^\d+$/.test(raw) ? Number(raw) : NaN;
};

/** The manager approval fields shown to cashiers and waiters. Empty → no override sent. */
export function readOverride(formData: FormData): Override | undefined {
  const username = str(formData, "overrideUsername", 60).toLowerCase();
  const password = str(formData, "overridePassword");
  return username && password ? { username, password } : undefined;
}

/** The menu picker's cart (a JSON list), cleaned: at most 50 lines of 1–50 each. */
export function readRoundItems(formData: FormData): RoundInput["items"] {
  try {
    const parsed = JSON.parse(String(formData.get("items") ?? "[]")) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((raw) => raw as { menuItemId?: unknown; quantity?: unknown; note?: unknown })
      .filter((i) => typeof i.menuItemId === "string" && Number.isInteger(i.quantity))
      .slice(0, 50)
      .map((i) => ({
        menuItemId: String(i.menuItemId),
        quantity: Math.min(50, Math.max(1, Number(i.quantity))),
        ...(typeof i.note === "string" && i.note.trim() ? { note: i.note.trim().slice(0, 300) } : {}),
      }));
  } catch {
    return [];
  }
}
