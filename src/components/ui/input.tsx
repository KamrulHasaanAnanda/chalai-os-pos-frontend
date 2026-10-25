import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "block h-12 w-full rounded-xl border border-[#e3d3b3] bg-white px-3.5 text-[16px] text-ink shadow-[inset_0_1px_1px_rgb(34_19_15/0.04)] transition-[border-color,box-shadow] duration-150 placeholder:text-[#a3958f] focus:border-maroon focus:ring-3 focus:ring-maroon/25 focus:outline-none aria-invalid:border-late aria-invalid:ring-late/20 disabled:bg-[#f6eedb]";

type FieldShell = { label: string; hint?: ReactNode; error?: string; optional?: string; className?: string };

function Shell({ id, label, hint, error, optional, className, children }: FieldShell & { id: string; children: ReactNode }) {
  const help = error ?? hint;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[14px] font-semibold">
        {label}
        {optional && <span className="ml-1 font-normal text-muted-foreground">({optional})</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {help && (
        <p id={`${id}-help`} className={cn("mt-1.5 text-[13px]", error ? "font-semibold text-late" : "text-muted-foreground")}>
          {help}
        </p>
      )}
    </div>
  );
}

const idFor = (name: string, label: string, id?: string) => id ?? `${name}-${label}`.replace(/\W+/g, "-");

/** Label above, input, hint or error below. Plain HTML, so it works before JavaScript loads. */
export function Field({ label, hint, error, optional, className, ...input }: ComponentProps<"input"> & FieldShell & { name: string }) {
  const id = idFor(input.name, label, input.id);
  return (
    <Shell id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-help` : undefined}
        className={inputClass}
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
}: ComponentProps<"input"> & FieldShell & { name: string; inputClassName?: string }) {
  const id = idFor(input.name, label, input.id);
  return (
    <Shell id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      <div className="relative">
        <span aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[17px] font-semibold text-muted-foreground">
          ৳
        </span>
        <input
          id={id}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-help` : undefined}
          className={cn(inputClass, "pl-8 font-semibold tabular-nums", inputClassName)}
          {...input}
        />
      </div>
    </Shell>
  );
}

export function Textarea({ label, hint, error, optional, className, ...input }: ComponentProps<"textarea"> & FieldShell & { name: string }) {
  const id = idFor(input.name, label, input.id);
  return (
    <Shell id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      <textarea
        id={id}
        rows={3}
        aria-invalid={error ? true : undefined}
        className={cn(inputClass, "h-auto min-h-24 py-3")}
        {...input}
      />
    </Shell>
  );
}

export function Notice({ tone = "error", children, className }: { tone?: "error" | "info" | "ok"; children: ReactNode; className?: string }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl border px-4 py-3 text-[15px] font-medium",
        tone === "error" && "border-late/20 bg-late/[0.06] text-late",
        tone === "ok" && "border-ok/20 bg-ok-soft text-ok",
        tone === "info" && "border-[#f1d98a] bg-sun-tint text-ink",
        className,
      )}
    >
      {children}
    </p>
  );
}
