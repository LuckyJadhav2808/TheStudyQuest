"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export function Switch({
  checked = false,
  onCheckedChange,
  className,
  disabled,
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-[1.5px] border-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-lime" : "bg-soft",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none block size-4.5 rounded-full bg-ink transition-transform mt-[1.5px]",
          checked ? "translate-x-5.5 bg-ink" : "translate-x-0.5 bg-muted"
        )}
      />
    </button>
  );
}
