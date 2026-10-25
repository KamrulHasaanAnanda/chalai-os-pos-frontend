"use server";

import { redirect } from "next/navigation";
import { ApiError, publicApi } from "@/lib/api/client";
import { act, clearSessionCookie, requireStaff, sessionToken, setSessionCookie } from "@/lib/session";

export async function login(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim().toLowerCase().replace(/\s/g, "").slice(0, 60);
  const password = String(formData.get("password") ?? "").slice(0, 200);
  const back = (error: string) => redirect(`/login?error=${error}&username=${encodeURIComponent(username)}`);
  if (!username || !password) back("required");

  let token: string;
  try {
    token = (await publicApi.login(username, password)).token;
  } catch (error) {
    back(error instanceof ApiError ? error.code : "unknown");
  }
  await setSessionCookie(token!);
  redirect("/?welcome=1");
}

export async function logout() {
  if (await sessionToken()) await act((api) => api.logout()).catch(() => undefined);
  await clearSessionCookie();
  redirect("/login");
}

export async function changePassword(formData: FormData) {
  await requireStaff({ passwordChange: true });
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const back = (error: string) => redirect(`/change-password?error=${error}`);
  if (!current || !next) back("required");
  if (next.length < 8) back("password_short");
  if (next !== formData.get("confirm")) back("password_mismatch");

  const result = await act((api) => api.changePassword(current, next));
  if (!result.ok) back(result.error.code);
  redirect("/?welcome=1");
}
