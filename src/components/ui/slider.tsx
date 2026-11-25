"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  showValue?: boolean;
  valueDisplay?: string | number;
}

export function Slider({
  label,
  showValue = false,
  valueDisplay,
  value,
  min = 0,
  max = 100,
  className,
  ...props
}: SliderProps) {
  const numVal = Number(value ?? 0);
  const numMin = Number(min);
  const numMax = Number(max);
  const pct = numMax > numMin ? Math.min(100, Math.max(0, ((numVal - numMin) / (numMax - numMin)) * 100)) : 0;

  return (
    <div className={cn("flex flex-col gap-1 w-full", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs font-bold text-muted">
          {label && <span>{label}</span>}
          {showValue && <span className="tabular-nums font-mono text-fg">{valueDisplay ?? `${Math.round(pct)}%`}</span>}
        </div>
      )}
      <div className="relative flex h-6 items-center">
        <input
          suppressHydrationWarning
          type="range"
          min={min}
          max={max}
          value={value}
          className="sq-slider peer h-2 w-full cursor-pointer appearance-none rounded-full border border-border-strong bg-surface-2 outline-none transition focus-visible:ring-2 focus-visible:ring-focus"
          style={{
            backgroundImage: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${pct}%, var(--surface-2) ${pct}%, var(--surface-2) 100%)`
          }}
          {...props}
        />
      </div>
    </div>
  );
}
