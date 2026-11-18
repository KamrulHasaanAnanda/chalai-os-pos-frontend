import { Avatar as ShadcnAvatar, AvatarFallback } from "@/components/ui/avatar";
import type { Role } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]);
  return (
    letters.length > 1 ? letters[0] + letters[1] : (letters[0] ?? "?")
  ).toUpperCase();
}

/** Soft tint + strong letter per role, so a list of staff reads at a glance. */
export const roleTint: Record<Role, string> = {
  superadmin: "bg-muted text-foreground",
  owner: "bg-[#f3e8ff] text-[#7e22ce]",
  manager: "bg-[#fdeee6] text-[#c2410c]",
  cashier: "bg-[#e8edff] text-[#3b4fd1]",
  waiter: "bg-[#e7f6ec] text-[#15803d]",
  kitchen: "bg-[#fdf6dc] text-[#a16207]",
};

/** shadcn Avatar showing the first letter, tinted by role. */
export function Avatar({
  name,
  role,
  className,
}: {
  name: string;
  role?: Role;
  className?: string;
}) {
  return (
    <ShadcnAvatar aria-hidden className={cn("size-9", className)}>
      <AvatarFallback
        className={cn(
          "text-sm font-semibold",
          role ? roleTint[role] : "bg-muted text-foreground",
        )}
      >
        {initials(name).slice(0, 1)}
      </AvatarFallback>
    </ShadcnAvatar>
  );
}
