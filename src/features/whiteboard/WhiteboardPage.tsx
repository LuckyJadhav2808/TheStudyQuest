"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Plus, Trash } from "@phosphor-icons/react";
import { Panels } from "@/components/shell/Panels";
import { Card, CardTitle, Skeleton, PageFrame } from "@/components/ui/misc";
import { whiteboardsRepo } from "@/core/repos";
import { useSettings } from "@/core/settings";
import { deleteWithUndo, useRows } from "@/features/shared/hooks";

const Board = dynamic(() => import("./ExcalidrawBoard"), { ssr: false, loading: () => <Skeleton className="h-full" /> });
export function WhiteboardPage() {
  const boards = useRows(whiteboardsRepo);
  const s = useSettings();
  const [id, setId] = useState<string | null>(null);
  useEffect(() => { if (boards && boards.length === 0) void whiteboardsRepo.add({ name: "Board 1", data: "" }); }, [boards]);
  if (!boards) return <PageFrame title="Whiteboard" subtitle="Loading"><Skeleton className="flex-1" /></PageFrame>;
  const cur = boards.find((b) => b.id === id) ?? boards[0];
  const list = (
    <Card className="gap-2">
      <CardTitle right={<button className="btn btn-sm btn-icon" aria-label="New board" onClick={() => void whiteboardsRepo.add({ name: `Board ${boards.length + 1}`, data: "" }).then((b) => setId(b.id))}><Plus size={16} weight="bold" /></button>}>Boards</CardTitle>
      <div className="scroll-thin min-h-0 flex-1 space-y-1">
        {boards.map((b) => <div key={b.id} className={`flex items-center rounded-full ${cur && b.id === cur.id ? "bg-primary text-on-primary" : "hover:bg-soft"}`}><button className="min-h-10 flex-1 truncate px-3 text-left text-sm font-bold" onClick={() => setId(b.id)}>{b.name}</button><button className="px-2" aria-label={`Delete ${b.name}`} onClick={() => void deleteWithUndo(whiteboardsRepo, b.id, "board")}><Trash size={14} /></button></div>)}
      </div>
    </Card>
  );
  const canvas = <Card className="!p-3">{cur && <Board key={cur.id} initial={cur.data || null} dark={s.theme === "obsidian" || (s.theme as string) === "ink" || (s.theme === "system" && typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches)} onSave={(json) => void whiteboardsRepo.update(cur.id, { data: json })} />}</Card>;
  return (
    <PageFrame title="Whiteboard" subtitle="Sketch, diagram, think. Boards autosave on this device.">
      <Panels className="lg:grid-cols-12" panels={[{ id: "list", label: "Boards", className: "lg:col-span-2", node: list }, { id: "board", label: "Canvas", className: "lg:col-span-10", node: canvas }]} />
    </PageFrame>
  );
}
