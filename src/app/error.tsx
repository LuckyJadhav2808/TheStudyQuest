"use client";
import { useEffect } from "react";
import { StrobiFace } from "@/features/strobi/StrobiFace";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[StudyQuest Route Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh w-full items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-[32px] border-[1.5px] border-border-strong bg-surface p-8 text-center shadow-sm">
        <StrobiFace mood="worried" size={76} />
        <h2 className="font-display text-2xl font-extrabold text-fg">Something tripped up</h2>
        <p className="text-sm text-muted">
          Your local notes and progress are safe in IndexedDB. Try reloading this view.
        </p>
        <button type="button" onClick={reset} className="btn btn-lime">
          Try again
        </button>
      </div>
    </div>
  );
}
