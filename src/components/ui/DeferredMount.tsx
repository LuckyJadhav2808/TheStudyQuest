"use client";
import type { ReactNode } from "react";
import { useInView } from "react-intersection-observer";
import { Skeleton } from "./misc";

export function DeferredMount({
  children,
  fallback,
  className,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
}) {
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin: "160px" });
  return (
    <div ref={ref} className={className}>
      {inView ? children : fallback ?? <Skeleton className="h-full min-h-24 w-full rounded-2xl" />}
    </div>
  );
}
