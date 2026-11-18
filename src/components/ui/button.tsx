import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow] outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.10)] hover:bg-primary/90",
        outline:
          "border-input bg-white text-foreground shadow-xs hover:border-zinc-400 hover:bg-zinc-50 aria-expanded:bg-zinc-50 dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "text-zinc-700 hover:bg-zinc-200/60 hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-emerald-600 text-white shadow-[0_1px_2px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-emerald-700",
      },
      // POS: touch sized for a cashier's tablet (spec §19, targets >= 48 px).
      size: {
        default: "h-12 gap-2 px-4 text-[15px]",
        xs: "h-8 gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 gap-1.5 px-3 text-sm",
        lg: "h-14 gap-2 px-5 text-base [&_svg:not([class*='size-'])]:size-5",
        xl: "h-16 gap-2.5 px-6 text-lg font-semibold [&_svg:not([class*='size-'])]:size-6",
        icon: "size-12 [&_svg:not([class*='size-'])]:size-5",
        "icon-sm": "size-9",
        "icon-lg": "size-14 [&_svg:not([class*='size-'])]:size-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
