import type { ReactNode } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5 text-[13px] font-bold text-fg", className)}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Select({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={cn("relative inline-flex w-full items-center", className)}>
      <select
        aria-label={ariaLabel}
        className="w-full appearance-none rounded-full border-[1.5px] border-line bg-surface px-3.5 py-2 pr-9 text-xs font-bold text-fg shadow-sm outline-none transition hover:border-ink focus-visible:ring-2 focus-visible:ring-lime cursor-pointer"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-surface text-fg font-normal">
            {o.label}
          </option>
        ))}
      </select>
      <CaretDown
        size={14}
        weight="bold"
        className="pointer-events-none absolute right-3 text-muted"
        aria-hidden="true"
      />
    </div>
  );
}
