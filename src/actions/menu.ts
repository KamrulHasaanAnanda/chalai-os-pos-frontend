"use server";

import { redirect } from "next/navigation";
import { act, managerRoles, requireStaff } from "@/lib/session";

export async function setAvailability(formData: FormData) {
  await requireStaff({ roles: managerRoles });
  const itemId = String(formData.get("itemId") ?? "").slice(0, 64);
  const isAvailable = formData.get("isAvailable") === "true";
  const back = String(formData.get("back") ?? "");
  const query = /^[a-z0-9=&-]*$/i.test(back) && back ? `${back}&` : "";
  const result = await act((api) => api.setAvailability(itemId, isAvailable));
  const at = Date.now();
  if (!result.ok)
    redirect(
      `/menu?${query}error=${result.error.code}&form=item-${itemId}&at=${at}`,
    );
  redirect(
    `/menu?${query}ok=${isAvailable ? "available" : "soldOut"}&n=${encodeURIComponent(result.data.name)}&at=${at}`,
  );
}

/** Portions left for a dish. Blank (or "clear") stops counting. */
export async function setStock(formData: FormData) {
  await requireStaff({ roles: managerRoles });
  const itemId = String(formData.get("itemId") ?? "").slice(0, 64);
  const stockLeft = readStock(formData);
  const at = Date.now();
  if (stockLeft === undefined)
    redirect(`/menu?error=stock_count&form=stock-${itemId}&at=${at}`);
  const result = await act((api) => api.setStock(itemId, stockLeft));
  if (!result.ok)
    redirect(`/menu?error=${result.error.code}&form=stock-${itemId}&at=${at}`);
  redirect(
    `/menu?ok=${stockLeft === null ? "stockCleared" : "stock"}&n=${encodeURIComponent(result.data.name)}&at=${at}`,
  );
}

/** null = no count; undefined = not a whole number from 0 to 9999. */
function readStock(formData: FormData): number | null | undefined {
  if (formData.get("clear") === "1") return null;
  const raw = String(formData.get("stockLeft") ?? "").trim();
  if (raw === "") return null;
  if (!/^\d{1,4}$/.test(raw)) return undefined;
  return Number(raw);
}
