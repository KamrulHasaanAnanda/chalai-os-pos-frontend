// Frontend-only demo: browser version of src/actions/menu.ts (next.config.ts aliases it).
import { act, demoApi } from "@/demo/api";
import { go } from "@/demo/navigation";

export async function setAvailability(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "").slice(0, 64);
  const isAvailable = formData.get("isAvailable") === "true";
  const result = act(() => demoApi.setAvailability(itemId, isAvailable));
  const at = Date.now();
  if (!result.ok)
    return go(`/menu?error=${result.error.code}&form=item-${itemId}&at=${at}`);
  go(
    `/menu?ok=${isAvailable ? "available" : "soldOut"}&n=${encodeURIComponent(result.data.name)}&at=${at}`,
  );
}

export async function setStock(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "").slice(0, 64);
  const raw = String(formData.get("stockLeft") ?? "").trim();
  const at = Date.now();
  const stockLeft =
    formData.get("clear") === "1" || raw === ""
      ? null
      : /^\d{1,4}$/.test(raw)
        ? Number(raw)
        : undefined;
  if (stockLeft === undefined)
    return go(`/menu?error=stock_count&form=stock-${itemId}&at=${at}`);
  const result = act(() => demoApi.setStock(itemId, stockLeft));
  if (!result.ok)
    return go(`/menu?error=${result.error.code}&form=stock-${itemId}&at=${at}`);
  go(
    `/menu?ok=${stockLeft === null ? "stockCleared" : "stock"}&n=${encodeURIComponent(result.data.name)}&at=${at}`,
  );
}
