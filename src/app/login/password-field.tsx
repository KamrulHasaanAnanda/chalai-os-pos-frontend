"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Password box with an eye that shows the characters. The name stays `password` for the login form. */
export function PasswordField({
  label,
  showLabel,
  hideLabel,
}: {
  label: string;
  showLabel: string;
  hideLabel: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="grid gap-2">
      <Label htmlFor="password">{label}</Label>
      <div className="relative">
        <Input
          id="password"
          name="password"
          type={show ? "text" : "password"}
          autoComplete="current-password"
          required
          className="h-12 pr-12 text-base"
        />
        <button
          type="button"
          onClick={() => setShow((value) => !value)}
          aria-label={show ? hideLabel : showLabel}
          aria-pressed={show}
          className="absolute inset-y-1 right-1 flex w-10 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-zinc-100 hover:text-foreground"
        >
          {show ? <EyeOffIcon className="size-4.5" /> : <EyeIcon className="size-4.5" />}
        </button>
      </div>
    </div>
  );
}
