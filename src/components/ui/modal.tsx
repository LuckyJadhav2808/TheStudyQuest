"use client";
import { useEffect, useRef, type ReactNode } from "react";
import Balancer from "react-wrap-balancer";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      aria-label={title}
      className={cn("m-auto max-h-[90dvh] w-[min(94vw,520px)] overflow-visible rounded-[32px] border-[1.5px] border-line bg-surface p-0 text-fg backdrop:bg-black/50", wide && "w-[min(96vw,860px)]")}
    >
      {open && (
        <div className="flex max-h-[90dvh] flex-col p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="card-title text-2xl"><Balancer>{title}</Balancer></h2>
            <button className="btn btn-icon btn-ghost" aria-label="Close dialog" onClick={onClose}><X size={20} weight="bold" /></button>
          </div>
          <div className="scroll-thin min-h-0 flex-1">{children}</div>
        </div>
      )}
    </dialog>
  );
}
