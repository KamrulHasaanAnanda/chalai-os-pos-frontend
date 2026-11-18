import type { ComponentProps, ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea as ShadcnTextarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * shadcn Input look for native controls that have no shadcn twin in a server form (e.g. <select>),
 * touch sized like the rest of the POS.
 */
export const inputClass =
  "flex h-12 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20";

type FieldShell = {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: string;
  className?: string;
};

function Shell({
  id,
  label,
  hint,
  error,
  optional,
  className,
  children,
}: FieldShell & { id: string; children: ReactNode }) {
  const help = error ?? hint;
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>
        {label}
        {optional && (
          <span className="font-normal text-muted-foreground">
            ({optional})
          </span>
        )}
      </Label>
      {children}
      {help && (
        <p
          id={`${id}-help`}
          className={cn(
            "text-[13px]",
            error ? "font-medium text-destructive" : "text-muted-foreground",
          )}
        >
          {help}
        </p>
      )}
    </div>
  );
}

const idFor = (name: string, label: string, id?: string) =>
  id ?? `${name}-${label}`.replace(/\W+/g, "-");

/** shadcn Label + Input with a hint or error under it. Plain HTML, so it works before JavaScript loads. */
export function Field({
  label,
  hint,
  error,
  optional,
  className,
  ...input
}: ComponentProps<"input"> & FieldShell & { name: string }) {
  const id = idFor(input.name, label, input.id);
  return (
    <Shell
      id={id}
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      className={className}
    >
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-help` : undefined}
        className="h-12 text-base"
        {...input}
      />
    </Shell>
  );
}

/** Whole-taka input with a ৳ prefix and the numeric keypad on phones. */
export function MoneyInput({
  label,
  hint,
  error,
  optional,
  className,
  inputClassName,
  ...input
}: ComponentProps<"input"> &
  FieldShell & { name: string; inputClassName?: string }) {
  const id = idFor(input.name, label, input.id);
  return (
    <Shell
      id={id}
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      className={className}
    >
      <div className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-semibold text-muted-foreground"
        >
          ৳
        </span>
        <Input
          id={id}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-help` : undefined}
          className={cn(
            "h-12 pl-7 text-base font-semibold tabular-nums",
            inputClassName,
          )}
          {...input}
        />
      </div>
    </Shell>
  );
}

export function Textarea({
  label,
  hint,
  error,
  optional,
  className,
  ...input
}: ComponentProps<"textarea"> & FieldShell & { name: string }) {
  const id = idFor(input.name, label, input.id);
  return (
    <Shell
      id={id}
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      className={className}
    >
      <ShadcnTextarea
        id={id}
        rows={3}
        aria-invalid={error ? true : undefined}
        className="min-h-24 text-base"
        {...input}
      />
    </Shell>
  );
}

/** shadcn Alert for a form's result: an error, a confirmation or plain information. */
export function Notice({
  tone = "error",
  children,
  className,
}: {
  tone?: "error" | "info" | "ok";
  children: ReactNode;
  className?: string;
}) {
  return (
    <Alert
      role={tone === "error" ? "alert" : "status"}
      variant={tone === "error" ? "destructive" : "default"}
      className={cn(
        tone === "ok" && "border-ok/30 bg-ok-soft text-ok",
        className,
      )}
    >
      <AlertDescription
        className={cn(
          "text-[15px]",
          tone === "error" && "text-destructive",
          tone === "ok" && "text-ok",
        )}
      >
        {children}
      </AlertDescription>
    </Alert>
  );
}
