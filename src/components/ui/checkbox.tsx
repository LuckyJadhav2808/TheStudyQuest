"use client";
import * as React from "react";
import { Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface CheckboxProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  onCheckedChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  onCheckedChange,
  label,
  disabled,
  id,
  className,
}: CheckboxProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const toggle = () => {
    if (!disabled) {
      const next = !checked;
      onChange?.(next);
      onCheckedChange?.(next);
    }
  };

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "inline-flex items-center gap-2.5 cursor-pointer select-none text-sm font-bold text-ink",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <button
        type="button"
        role="checkbox"
        id={inputId}
        aria-checked={checked}
        disabled={disabled}
        onClick={toggle}
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-md border-[1.5px] border-border-strong transition-colors",
          checked ? "bg-primary text-on-primary shadow-xs" : "bg-surface text-fg hover:bg-surface-2"
        )}
      >
        {checked && <Check size={14} weight="bold" />}
      </button>
      {label && <span>{label}</span>}
    </label>
  );
}
