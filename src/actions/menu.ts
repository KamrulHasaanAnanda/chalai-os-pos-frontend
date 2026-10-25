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
  if (!result.ok) redirect(`/menu?${query}error=${result.error.code}&form=item-${itemId}&at=${at}`);
  redirect(`/menu?${query}ok=${isAvailable ? "available" : "soldOut"}&n=${encodeURIComponent(result.data.name)}&at=${at}`);
}
