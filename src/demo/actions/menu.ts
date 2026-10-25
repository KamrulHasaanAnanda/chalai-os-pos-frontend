// Frontend-only demo: browser version of src/actions/menu.ts (next.config.ts aliases it).
import { act, demoApi } from "@/demo/api";
import { go } from "@/demo/navigation";

export async function setAvailability(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "").slice(0, 64);
  const isAvailable = formData.get("isAvailable") === "true";
  const result = act(() => demoApi.setAvailability(itemId, isAvailable));
  const at = Date.now();
  if (!result.ok) return go(`/menu?error=${result.error.code}&form=item-${itemId}&at=${at}`);
  go(`/menu?ok=${isAvailable ? "available" : "soldOut"}&n=${encodeURIComponent(result.data.name)}&at=${at}`);
}
