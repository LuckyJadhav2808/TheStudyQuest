"use client";
import "@excalidraw/excalidraw/index.css";
import { Excalidraw, exportToBlob, exportToSvg, serializeAsJSON } from "@excalidraw/excalidraw";
import { useRef } from "react";
import { downloadBlob } from "@/lib/utils";

type Els = Parameters<typeof exportToBlob>[0]["elements"];
type App = Parameters<typeof exportToBlob>[0]["appState"];
type Files = Parameters<typeof exportToBlob>[0]["files"];
interface Props { initial: string | null; dark: boolean; onSave: (json: string) => void }

export default function ExcalidrawBoard({ initial, dark, onSave }: Props) {
  const latest = useRef<{ e: Els; a: App; f: Files } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  let data: { elements?: Els; appState?: Record<string, unknown> } | undefined;
  try { data = initial ? (JSON.parse(initial) as typeof data) : undefined; if (data?.appState) delete data.appState.collaborators; } catch { data = undefined; }
  const cur = () => latest.current;
  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-sm" onClick={async () => { const c = cur(); if (c) downloadBlob("board.png", await exportToBlob({ elements: c.e, appState: c.a, files: c.f, mimeType: "image/png" })); }}>PNG</button>
        <button className="btn btn-sm" onClick={async () => { const c = cur(); if (c) downloadBlob("board.svg", (await exportToSvg({ elements: c.e, appState: c.a, files: c.f })).outerHTML, "image/svg+xml"); }}>SVG</button>
        <button className="btn btn-sm" onClick={() => { const c = cur(); if (c) downloadBlob("board.excalidraw", serializeAsJSON(c.e, c.a, c.f, "local"), "application/json"); }}>JSON</button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-[24px] border border-line/30">
        <Excalidraw
          theme={dark ? "dark" : "light"}
          initialData={data as never}
          onChange={(e, a, f) => { latest.current = { e, a, f }; clearTimeout(timer.current); timer.current = setTimeout(() => onSave(serializeAsJSON(e, a, f, "local")), 800); }}
        />
      </div>
    </div>
  );
}
