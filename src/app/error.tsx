"use client";
import { StrobiFace } from "@/features/strobi/StrobiFace";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid h-full place-items-center p-4">
      <div className="bento-card flex max-w-md flex-col items-center gap-3 text-center">
        <StrobiFace mood="alert" size={104} />
        <h1 className="font-display text-3xl">Something broke</h1>
        <p className="text-sm text-muted">{error.message || "Unexpected error."} Your data is still safe on this device.</p>
        <button className="btn btn-lime" onClick={reset}>Retry</button>
      </div>
    </div>
  );
}
