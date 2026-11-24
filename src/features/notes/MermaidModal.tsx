"use client";
import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { renderMermaid } from "@/lib/markdown";

const SAMPLE = "graph TD\n  A[Read] --> B{Understood?}\n  B -- yes --> C[Practice]\n  B -- no --> A";
export function MermaidModal({ open, onClose, onInsert }: { open: boolean; onClose: () => void; onInsert: (block: string) => void }) {
  const [code, setCode] = useState(SAMPLE);
  const [err, setErr] = useState("");
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (!host.current) return;
      renderMermaid(host.current, code, "mm" + Math.random().toString(36).slice(2)).then(() => setErr("")).catch((e: unknown) => setErr(e instanceof Error ? e.message.slice(0, 120) : "Syntax error"));
    }, 400);
    return () => clearTimeout(t);
  }, [code, open]);
  return (
    <Modal open={open} onClose={onClose} title="Mermaid diagram" wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <textarea className="input !min-h-64 font-mono text-xs" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Mermaid source" />
        <div className="min-h-64 overflow-auto rounded-[24px] bg-white p-3 text-ink"><div ref={host} />{err && <p className="text-xs text-red-600">{err}</p>}</div>
      </div>
      <button className="btn btn-lime mt-3" onClick={() => { onInsert("\n```mermaid\n" + code + "\n```\n"); onClose(); }}>Insert diagram</button>
    </Modal>
  );
}
