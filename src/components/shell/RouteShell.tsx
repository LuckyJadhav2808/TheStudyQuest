"use client";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { useFlags, type FlagName } from "@/core/flags";
import { StrobiFace } from "@/features/strobi/StrobiFace";
import { Skeleton } from "@/components/ui/misc";

export function PageSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4 p-3 sm:p-4" aria-busy>
      <Skeleton className="h-10 w-64" />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
        <Skeleton className="rounded-[32px] lg:col-span-8" />
        <Skeleton className="rounded-[32px] max-sm:hidden lg:col-span-4" />
      </div>
    </div>
  );
}
export function ErrorCard({ error, resetErrorBoundary }: FallbackProps) {
  const msg = error instanceof Error ? error.message : "Unknown error";
  return (
    <div className="grid h-full place-items-center p-4">
      <div className="bento-card flex max-w-md flex-col items-center gap-3 text-center">
        <StrobiFace mood="alert" size={88} />
        <h2 className="font-display text-2xl">Strobi tripped over something</h2>
        <p className="text-sm text-muted">{msg}. Your data is safe on this device. Give it another go.</p>
        <button className="btn btn-lime" onClick={resetErrorBoundary}>Try again</button>
      </div>
    </div>
  );
}
export function FeatureGuard({ flag, children }: { flag?: FlagName; children: ReactNode }) {
  const flags = useFlags();
  if (flag && !flags[flag]) {
    return (
      <div className="grid h-full place-items-center p-4">
        <div className="bento-card flex max-w-md flex-col items-center gap-3 text-center">
          <StrobiFace mood="sleepy" size={88} />
          <h2 className="font-display text-2xl">This feature is switched off</h2>
          <p className="text-sm text-muted">You can turn it back on in Settings under feature flags.</p>
          <Link href="/settings" className="btn btn-lime">Open settings</Link>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
export function RouteShell({ flag, children }: { flag?: FlagName; children: ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorCard}>
      <FeatureGuard flag={flag}>
        <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
      </FeatureGuard>
    </ErrorBoundary>
  );
}
