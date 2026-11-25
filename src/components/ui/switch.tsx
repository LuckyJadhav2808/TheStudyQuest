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
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-[1.5px] border-border-strong transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-surface-2",
        className
      )}
      {...props}
    >
      <span
        style={{ width: 16, height: 16 }}
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full transition-transform",
          checked ? "translate-x-5 bg-on-primary" : "translate-x-1 bg-ink-muted"
        )}
      />
    </button>
  );
}
