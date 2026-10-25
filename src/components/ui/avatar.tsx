import { cn } from "@/lib/utils";

export function initials(name: string): string {
  const letters = name.split(/\s+/).filter(Boolean).map((word) => word[0]);
  return (letters.length > 1 ? letters[0] + letters[1] : (letters[0] ?? "?")).toUpperCase();
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-maroon-tint text-[13px] font-bold text-maroon", className)}
    >
      {initials(name)}
    </span>
  );
}
