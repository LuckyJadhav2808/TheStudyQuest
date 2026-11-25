"use client";
import { DndContext, PointerSensor, TouchSensor, closestCorners, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarBlank, CaretRight, Plus } from "@phosphor-icons/react";
import { format, isPast, isToday, parseISO } from "date-fns";
import { useMemo, useState } from "react";
import { Panels } from "@/components/shell/Panels";
import { BentoCard } from "@/components/shell/BentoCard";
import { EmptyState, GhostList } from "@/components/ui/design-primitives";
import { Badge, PageFrame, ProgressBar, Skeleton } from "@/components/ui/misc";
import { Select } from "@/components/ui/fields";
import { emit } from "@/core/events";
import { tasksRepo } from "@/core/repos";
import type { Priority, Task, TaskStatus } from "@/core/types";
import { useRows } from "@/features/shared/hooks";
import { useUI } from "@/components/shell/ui-store";
import { PRIORITY_COLOR, TaskEditor } from "./TaskEditor";

const COLS: { id: TaskStatus; label: string; headerBg: string }[] = [
  { id: "todo", label: "To do", headerBg: "bg-peach/45" },
  { id: "doing", label: "In progress", headerBg: "bg-lavender/45" },
  { id: "done", label: "Done", headerBg: "bg-teal/20" },
];
const RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

async function moveTask(t: Task, status: TaskStatus, order: number) {
  await tasksRepo.update(t.id, { status, order, completedAt: status === "done" ? Date.now() : undefined });
  if (status === "done" && t.status !== "done") emit("task.completed", { priority: t.priority, title: t.title });
}
function TaskCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const done = task.subtasks.filter((s) => s.done).length;
  const next = task.status === "todo" ? "doing" : task.status === "doing" ? "done" : null;
  const overdue = task.due && task.status !== "done" && isPast(parseISO(task.due)) && !isToday(parseISO(task.due));
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, touchAction: "manipulation" }} className="tile flex flex-col gap-2 border border-line/20 bg-surface" {...attributes} {...listeners}>
      <button className="text-left text-sm font-bold" onClick={onOpen}>{task.title}</button>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge color={PRIORITY_COLOR[task.priority]}>{task.priority}</Badge>
        {task.due && <span className={`chip !min-h-6 !px-2 text-[11px] ${overdue ? "!border-red-500 text-red-600" : ""}`}><CalendarBlank size={12} />{format(parseISO(task.due), "d MMM")}</span>}
        {task.subtasks.length > 0 && <span className="num text-[11px] font-bold text-muted">{done}/{task.subtasks.length}</span>}
        {task.tags.map((t) => <span key={t} className="text-[11px] font-semibold text-muted">#{t}</span>)}
        {next && <button aria-label={`Move to ${next}`} className="ml-auto grid size-8 place-items-center rounded-full bg-ink text-paper" onPointerDown={(e) => e.stopPropagation()} onClick={() => void moveTask(task, next, Date.now())}><CaretRight size={14} weight="bold" /></button>}
      </div>
    </div>
  );
}
function Column({ id, label, headerBg, tasks, onOpen }: { id: TaskStatus; label: string; headerBg: string; tasks: Task[]; onOpen: (t: Task) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const add = useUI((s) => s.set);
  return (
    <BentoCard
      className="h-full"
      lift={false}
      headerClassName={`${headerBg} border-b border-line/10`}
      title={
        <div className="flex items-center gap-2">
          <h2 className="card-title text-base sm:text-lg">{label}</h2>
          <span className="num inline-flex min-w-6 items-center justify-center rounded-full border border-line/40 bg-surface px-2 py-0.5 text-xs font-extrabold">
            {tasks.length}
          </span>
        </div>
      }
      action={
        id === "todo" ? (
          <button className="btn btn-lime btn-sm !min-h-8 !px-3 text-xs" aria-label="Add quest" onClick={() => add({ quickAdd: "task" })}>
            <Plus size={14} weight="bold" /> Add
          </button>
        ) : undefined
      }
    >
      <div
        ref={setNodeRef}
        className={`scroll-thin flex min-h-0 flex-1 flex-col gap-2 rounded-[20px] p-1 transition ${
          isOver ? "bg-lime/25 ring-2 ring-lime" : ""
        }`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => <TaskCard key={t.id} task={t} onOpen={() => onOpen(t)} />)}
        </SortableContext>
        {tasks.length === 0 &&
          (id === "todo" ? (
            <EmptyState
              title="Quiet in here"
              hint="Add your first quest to start earning XP."
              mood="happy"
              ghostCount={2}
              ghostLabel="Quest"
              action={
                <button className="btn btn-lime btn-sm" onClick={() => add({ quickAdd: "task" })}>
                  <Plus size={14} weight="bold" /> New quest
                </button>
              }
            />
          ) : (
            <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-line/40 bg-soft/30 p-4 text-center">
              <p className="text-xs font-bold text-muted">
                {id === "done" ? "Completed quests land here" : "Drag an active quest here"}
              </p>
              <GhostList count={2} label={id === "done" ? "Cleared" : "Active"} className="max-w-[220px]" />
            </div>
          ))}
      </div>
    </BentoCard>
  );
}
export function TasksPage() {
  const rows = useRows(tasksRepo);
  const [q, setQ] = useState("");
  const [pri, setPri] = useState("all");
  const [sort, setSort] = useState("manual");
  const [edit, setEdit] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }));
  const filtered = useMemo(() => {
    let r = (rows ?? []).filter((t) => (pri === "all" || t.priority === pri) && (t.title + t.tags.join(" ")).toLowerCase().includes(q.toLowerCase()));
    r = [...r].sort((a, b) => sort === "priority" ? RANK[a.priority] - RANK[b.priority] : sort === "due" ? (a.due ?? "9999").localeCompare(b.due ?? "9999") : a.order - b.order);
    return r;
  }, [rows, q, pri, sort]);
  if (!rows) return <PageFrame title="Quests" subtitle="Loading your board"><Skeleton className="flex-1" /></PageFrame>;
  function onEnd(e: DragEndEvent) {
    if (!e.over || !rows) return;
    const t = rows.find((x) => x.id === e.active.id);
    if (!t) return;
    const overTask = rows.find((x) => x.id === e.over?.id);
    const status = (overTask ? overTask.status : e.over.id) as TaskStatus;
    const col = rows.filter((x) => x.status === status && x.id !== t.id).sort((a, b) => a.order - b.order);
    const idx = overTask ? col.findIndex((x) => x.id === overTask.id) : col.length;
    const prev = col[idx - 1]?.order ?? (col[idx]?.order ?? Date.now()) - 1000;
    const nxt = col[idx]?.order ?? prev + 2000;
    void moveTask(t, status, (prev + nxt) / 2);
  }
  const editing = rows.find((t) => t.id === edit) ?? null;
  const doneCount = rows.filter((t) => t.status === "done").length;
  const totalCount = rows.length;
  return (
    <PageFrame
      title="Quests"
      subtitle="Drag cards between columns. Finishing a quest earns XP and coins."
      actions={
        <button className="btn btn-lime btn-sm" onClick={() => useUI.getState().set({ quickAdd: "task" })}>
          <Plus size={16} weight="bold" /> New
        </button>
      }
    >
      <div style={{ gap: "var(--gutter, 16px)" }} className="flex h-full min-h-0 flex-col">
        {/* Progress strip + compact filter row */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-[20px] border border-line/30 bg-surface px-3.5 py-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-extrabold num">
              {doneCount} of {totalCount} quests done
            </span>
            <div className="w-28 hidden sm:block">
              <ProgressBar pct={totalCount > 0 ? doneCount / totalCount : 0} color="var(--color-teal)" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input className="input !min-h-8 max-w-44 text-xs" placeholder="Search quests" aria-label="Search quests" value={q} onChange={(e) => setQ(e.target.value)} />
            <Select className="!min-h-8 max-w-36" value={pri} onChange={setPri} options={[{ value: "all", label: "All priorities" }, ...(["urgent", "high", "medium", "low"] as const).map((v) => ({ value: v, label: v }))]} />
            <Select className="!min-h-8 max-w-36" value={sort} onChange={setSort} options={[{ value: "manual", label: "Manual order" }, { value: "priority", label: "By priority" }, { value: "due", label: "By due date" }]} />
          </div>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onEnd}>
          <Panels
            className="sm:grid-cols-3 sm:grid-rows-[minmax(0,1fr)]"
            panels={COLS.map((c) => ({
              id: c.id,
              label: c.label,
              node: <Column id={c.id} label={c.label} headerBg={c.headerBg} tasks={filtered.filter((t) => t.status === c.id)} onOpen={(t) => setEdit(t.id)} />,
            }))}
          />
        </DndContext>
      </div>
      <TaskEditor task={editing} onClose={() => setEdit(null)} />
    </PageFrame>
  );
}
