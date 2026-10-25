// Frontend-only demo: browser version of src/actions/auth.ts (next.config.ts aliases it). Same form fields, same
// redirects; the session is the demo store's sessionUserId.
import { act, demoApi } from "@/demo/api";
import { go } from "@/demo/navigation";

export async function login(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim().toLowerCase().replace(/\s/g, "").slice(0, 60);
  const password = String(formData.get("password") ?? "").slice(0, 200);
  const back = (error: string) => go(`/login?error=${error}&username=${encodeURIComponent(username)}`);
  if (!username || !password) return back("required");

  const result = act(() => demoApi.login(username, password));
  if (!result.ok) return back(result.error.code);
  go("/?welcome=1");
}

export async function logout() {
  demoApi.logout();
  go("/login");
}

/** The demo accounts never have a temporary password; kept so the module matches src/actions/auth.ts. */
export async function changePassword() {
  go("/");
}
