"use client";
import "@excalidraw/excalidraw/index.css";
import { Excalidraw, exportToBlob, exportToSvg, serializeAsJSON } from "@excalidraw/excalidraw";
import { useRef } from "react";
import { downloadBlob } from "@/lib/utils";

type Els = Parameters<typeof exportToBlob>[0]["elements"];
type App = Parameters<typeof exportToBlob>[0]["appState"];
type Files = Parameters<typeof exportToBlob>[0]["files"];
interface Props { initial: string | null; dark: boolean; compact?: boolean; onSave: (json: string) => void }

export default function ExcalidrawBoard({ initial, dark, compact, onSave }: Props) {
  const latest = useRef<{ e: Els; a: App; f: Files } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  let data: { elements?: Els; appState?: Record<string, unknown> } | undefined;
  try { data = initial ? (JSON.parse(initial) as typeof data) : undefined; if (data?.appState) delete data.appState.collaborators; } catch { data = undefined; }
  const cur = () => latest.current;
  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        <button type="button" className={compact ? "chip !min-h-6 !px-2.5 text-[11px] font-bold bg-surface hover:bg-soft" : "btn btn-sm"} onClick={async () => { const c = cur(); if (c) downloadBlob("board.png", await exportToBlob({ elements: c.e, appState: c.a, files: c.f, mimeType: "image/png" })); }}>PNG</button>
        <button type="button" className={compact ? "chip !min-h-6 !px-2.5 text-[11px] font-bold bg-surface hover:bg-soft" : "btn btn-sm"} onClick={async () => { const c = cur(); if (c) downloadBlob("board.svg", (await exportToSvg({ elements: c.e, appState: c.a, files: c.f })).outerHTML, "image/svg+xml"); }}>SVG</button>
        <button type="button" className={compact ? "chip !min-h-6 !px-2.5 text-[11px] font-bold bg-surface hover:bg-soft" : "btn btn-sm"} onClick={() => { const c = cur(); if (c) downloadBlob("board.excalidraw", serializeAsJSON(c.e, c.a, c.f, "local"), "application/json"); }}>JSON</button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-line/40 bg-surface">
        <Excalidraw
          theme={dark ? "dark" : "light"}
          initialData={data as never}
          UIOptions={compact ? { canvasActions: { loadScene: false, export: false, saveAsImage: false } } : undefined}
          onChange={(e, a, f) => { latest.current = { e, a, f }; clearTimeout(timer.current); timer.current = setTimeout(() => onSave(serializeAsJSON(e, a, f, "local")), 800); }}
        />
      </div>
    </div>
  );
}
