import type { Role } from "@/lib/api/types";

/** Which roles see what. Plain data, so Server Components and the browser-only demo share it. */
export const floorRoles: Role[] = ["owner", "manager", "cashier", "waiter"];
export const billRoles: Role[] = ["owner", "manager", "cashier"];
export const managerRoles: Role[] = ["owner", "manager"];
export const kitchenRoles: Role[] = ["owner", "manager", "kitchen"];

/** Cashiers and waiters need a manager's username + password for discounts and cancellations. */
export const needsOverride = (role: Role) => !managerRoles.includes(role);

export function homeFor(role: Role): string {
  return role === "kitchen" ? "/kitchen" : "/floor";
}
