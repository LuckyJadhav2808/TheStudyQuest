"use client";
import type { CSSProperties, ReactNode } from "react";
import Balancer from "react-wrap-balancer";
import { cn } from "@/lib/utils";
import { BlobBackdrop } from "@/components/shapes";

export interface BentoCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  curvedCorner?: ReactNode;
  blob?: { preset?: 0 | 1 | 2; color?: string; className?: string; animate?: boolean };
  decorations?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  lift?: boolean;
  scrollable?: boolean;
  autoHeight?: boolean;
  style?: CSSProperties;
}

export function BentoCard({
  title,
  subtitle,
  action,
  footer,
  curvedCorner,
  blob,
  decorations,
  children,
  className,
  headerClassName,
  bodyClassName,
  footerClassName,
  lift = true,
  scrollable = false,
  autoHeight = false,
  style,
  ...rest
}: BentoCardProps) {
  const hasHeader = Boolean(title || subtitle || action);

  return (
    <div
      data-bento-card="true"
      style={style}
      className={cn(
        "bento-card !p-0 relative flex flex-col min-h-0 overflow-hidden select-none",
        lift && "lift",
        className
      )}
      {...rest}
    >
      {/* Background decorations - pointer-events-none and z-0 */}
      {blob && (
        <BlobBackdrop
          preset={blob.preset ?? 0}
          color={blob.color ?? "var(--color-lavender)"}
          className={cn("pointer-events-none absolute -z-0 opacity-40", blob.className)}
          animate={blob.animate ?? false}
        />
      )}
      {decorations}
      {curvedCorner && (
        <div className="pointer-events-auto absolute right-0 top-0 z-20">
          {curvedCorner}
        </div>
      )}

      {/* Header: fixed height / compact, line-clamp-1 on subtitle */}
      {hasHeader && (
        <div
          style={{
            paddingLeft: "var(--card-pad, 24px)",
            paddingRight: curvedCorner ? "calc(var(--card-pad, 24px) + 36px)" : "var(--card-pad, 24px)",
            paddingTop: "calc(var(--card-pad, 24px) * 0.85)",
            paddingBottom: "8px",
          }}
          className={cn(
            "relative z-10 flex shrink-0 items-start justify-between gap-2 min-h-[44px]",
            headerClassName
          )}
        >
          <div className="min-w-0 flex-1">
            {typeof title === "string" ? (
              <h2 className="card-title text-base sm:text-lg font-display font-extrabold text-fg leading-tight break-words">
                <Balancer>{title}</Balancer>
              </h2>
            ) : (
              title
            )}
            {subtitle && (
              <p className="mt-0.5 text-[11px] text-muted font-medium line-clamp-2 leading-normal density-hide-sub">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="flex shrink-0 items-center gap-1.5">{action}</div>}
        </div>
      )}

      {/* Body: container-type: size unless autoHeight, flex-1 min-h-0, relative z-10 */}
      <div
        style={{
          ...(autoHeight ? {} : { containerType: "size" }),
          paddingLeft: "var(--card-pad, 24px)",
          paddingRight: "var(--card-pad, 24px)",
          paddingTop: hasHeader ? "4px" : "var(--card-pad, 24px)",
          paddingBottom: footer ? "12px" : "var(--card-pad, 24px)",
        }}
        className={cn(
          "relative z-10 flex-1 min-h-0 min-w-0",
          scrollable ? "overflow-y-auto scroll-thin" : "overflow-hidden flex flex-col",
          bodyClassName
        )}
      >
        {children}
      </div>

      {/* Optional Footer: fixed height, relative z-10 */}
      {footer && (
        <div
          style={{
            paddingLeft: "var(--card-pad, 24px)",
            paddingRight: "var(--card-pad, 24px)",
            paddingTop: "10px",
            paddingBottom: "10px",
          }}
          className={cn(
            "relative z-10 flex shrink-0 items-center justify-between border-t border-line/10 text-xs text-muted bg-soft/40",
            footerClassName
          )}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
