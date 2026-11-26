"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Plus } from "@phosphor-icons/react";
import { DeferredMount } from "@/components/ui/DeferredMount";
import { Skeleton } from "@/components/ui/misc";
import { whiteboardsRepo } from "@/core/repos";
import { useSettings } from "@/core/settings";
import { useRows } from "@/features/shared/hooks";

const ExcalidrawBoard = dynamic(() => import("@/features/whiteboard/ExcalidrawBoard"), {
  ssr: false,
  loading: () => <Skeleton className="h-full rounded-2xl" />,
});

export function WhiteboardDock() {
  const boards = useRows(whiteboardsRepo);
  const s = useSettings();
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    if (boards && boards.length === 0) {
      void whiteboardsRepo.add({ name: "Board 1", data: "" });
    }
  }, [boards]);

  if (!boards) return <Skeleton className="h-full rounded-2xl" />;
  const cur = boards.find((b) => b.id === id) ?? boards[0];

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-2.5">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        {boards.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setId(b.id)}
            className={`chip !min-h-6 shrink-0 !px-2.5 text-[11px] font-bold transition ${
              cur?.id === b.id
                ? "bg-primary text-on-primary border-border-strong"
                : "bg-surface hover:bg-soft text-muted hover:text-fg"
            }`}
          >
            {b.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() =>
            void whiteboardsRepo
              .add({ name: `Board ${boards.length + 1}`, data: "" })
              .then((b) => setId(b.id))
          }
          className="chip !min-h-6 shrink-0 !px-2 text-[11px] font-bold border-dashed hover:border-border-strong"
          title="New board"
          aria-label="New board"
        >
          <Plus size={12} weight="bold" />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        {cur && (
          <DeferredMount className="h-full">
            <ExcalidrawBoard
              key={cur.id}
              compact
              initial={cur.data || null}
              dark={s.theme === "obsidian" || (s.theme as string) === "ink" || (s.theme === "system" && typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches)}
              onSave={(json) => void whiteboardsRepo.update(cur.id, { data: json })}
            />
          </DeferredMount>
        )}
      </div>
    </div>
  );
}
