"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  orientation?: "vertical" | "horizontal" | "both";
}

export function ScrollArea({
  children,
  className,
  orientation = "vertical",
  ...props
}: ScrollAreaProps) {
  return (
    <div
      data-scrollable="true"
      className={cn(
        "relative min-h-0 min-w-0 flex-1 scroll-thin",
        orientation === "vertical" && "overflow-y-auto overflow-x-hidden",
        orientation === "horizontal" && "overflow-x-auto overflow-y-hidden",
        orientation === "both" && "overflow-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
