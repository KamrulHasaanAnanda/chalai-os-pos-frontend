"use client";
// Client component: useFormStatus is the only way to show the pending server action (spinner + disabled).

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { buttonClass, type ButtonStyle } from "./button";

export function SubmitButton({
  variant = "primary",
  size,
  block,
  className,
  children,
  disabled,
  ...props
}: Omit<ComponentProps<"button">, "type"> & ButtonStyle) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      className={cn(buttonClass({ variant, size, block }), "relative", className)}
      {...props}
    >
      {pending && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Icon name="spinner" className="size-5 animate-spin" />
        </span>
      )}
      <span className={cn("inline-flex items-center gap-2", pending && "invisible")}>{children}</span>
    </button>
  );
}
