import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Same API as the owner and QR apps. POS sizes are touch sized: md is 48 px, lg 56 px.
 * primary = maroon, accent = sun (the one most important action on a screen), secondary = white + border.
 */
export const buttonClass = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition-[background-color,box-shadow,transform,opacity] duration-150 ease-out outline-none select-none focus-visible:ring-3 focus-visible:ring-maroon/25 active:translate-y-px disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-maroon text-white shadow-[0_1px_0_rgb(0_0_0/0.08)] hover:bg-maroon-soft",
        accent: "bg-sun text-ink shadow-[0_1px_0_rgb(0_0_0/0.08)] hover:bg-[#ffd873] focus-visible:ring-sun/60",
        secondary: "border border-line bg-white text-ink shadow-[0_1px_2px_rgb(34_19_15/0.05)] hover:bg-[#fbf6ec]",
        ghost: "text-ink hover:bg-[#f6eedb]",
        danger: "bg-late text-white hover:bg-[#b91c1c] focus-visible:ring-late/30",
        dangerSoft: "bg-late/10 text-late hover:bg-late/15 focus-visible:ring-late/30",
        success: "bg-ok text-white hover:bg-[#126c34] focus-visible:ring-ok/30",
        dark: "bg-ink text-white hover:bg-[#3a2722]",
        onDark: "bg-white/10 text-white hover:bg-white/20 focus-visible:ring-white/40",
      },
      size: {
        sm: "h-9 px-3 text-[14px] [&_svg]:size-4",
        md: "h-12 px-4 text-[15px] [&_svg]:size-[18px]",
        lg: "h-14 px-5 text-[16px] [&_svg]:size-5",
        xl: "h-16 px-6 text-[20px] font-bold [&_svg]:size-6",
        icon: "size-12 [&_svg]:size-5",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export type ButtonStyle = VariantProps<typeof buttonClass>;

export function Button({ variant, size, block, className, type = "button", ...props }: ComponentProps<"button"> & ButtonStyle) {
  return <button type={type} className={cn(buttonClass({ variant, size, block }), className)} {...props} />;
}

export function ButtonLink({ variant, size, block, className, ...props }: ComponentProps<typeof Link> & ButtonStyle) {
  return <Link className={cn(buttonClass({ variant, size, block }), className)} {...props} />;
}
