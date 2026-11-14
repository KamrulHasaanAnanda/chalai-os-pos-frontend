"use client";
// Client component: useFormStatus is the only way to show the pending server action (spinner + disabled).
import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** shadcn Button that submits its form and shows a spinner while the server action runs. */
export function SubmitButton({
  className,
  children,
  disabled,
  ...props
}: Omit<ComponentProps<typeof Button>, "type" | "asChild">) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending || undefined} className={cn("relative", className)} {...props}>
      {pending && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Icon name="spinner" className="size-5 animate-spin" />
        </span>
      )}
      <span className={cn("inline-flex items-center gap-2", pending && "invisible")}>{children}</span>
    </Button>
  );
}
