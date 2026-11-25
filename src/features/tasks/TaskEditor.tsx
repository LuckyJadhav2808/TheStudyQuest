"use client";
import { useState } from "react";
import { Trash } from "@phosphor-icons/react";
import { Modal } from "@/components/ui/modal";
import { Field, Select } from "@/components/ui/fields";
import { tasksRepo } from "@/core/repos";
import type { Priority, Task } from "@/core/types";
import { deleteWithUndo } from "@/features/shared/hooks";
import { uid } from "@/lib/utils";

export const PRIORITY_COLOR: Record<Priority, string> = { low: "var(--domain-stats-fill)", medium: "var(--domain-tools-fill)", high: "var(--domain-quests-fill)", urgent: "var(--danger)" };

export function TaskEditor({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const [sub, setSub] = useState("");
  if (!task) return <Modal open={false} onClose={onClose} title="Edit quest"><span /></Modal>;
  const patch = (p: Partial<Task>) => void tasksRepo.update(task.id, p);
  return (
    <Modal open onClose={onClose} title="Edit quest">
      <div className="flex flex-col gap-3">
        <Field label="Title"><input className="input" defaultValue={task.title} onBlur={(e) => patch({ title: e.target.value.trim() || task.title })} /></Field>
        <Field label="Notes"><textarea className="input" defaultValue={task.description} onBlur={(e) => patch({ description: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Priority"><Select value={task.priority} onChange={(v) => patch({ priority: v as Priority })} options={["low", "medium", "high", "urgent"].map((v) => ({ value: v, label: v }))} /></Field>
          <Field label="Due date"><input type="date" className="input" defaultValue={task.due} onChange={(e) => patch({ due: e.target.value || undefined })} /></Field>
        </div>
        <Field label="Tags (comma separated)"><input className="input" defaultValue={task.tags.join(", ")} onBlur={(e) => patch({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} /></Field>
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-bold">Subtasks</p>
          {task.subtasks.map((s) => (
            <label key={s.id} className="flex min-h-9 items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-ink" checked={s.done} onChange={() => patch({ subtasks: task.subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)) })} />
              <span className={s.done ? "line-through opacity-60" : ""}>{s.title}</span>
              <button className="ml-auto text-muted" aria-label={`Remove ${s.title}`} onClick={() => patch({ subtasks: task.subtasks.filter((x) => x.id !== s.id) })}><Trash size={16} /></button></label>
          ))}
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (sub.trim()) { patch({ subtasks: [...task.subtasks, { id: uid(), title: sub.trim(), done: false }] }); setSub(""); } }}>
            <input className="input" placeholder="Add a subtask" value={sub} onChange={(e) => setSub(e.target.value)} /><button className="btn btn-ink" type="submit">Add</button>
          </form>
        </div>
        <button className="btn border-[var(--danger)] text-[var(--danger-text)]" onClick={() => { onClose(); void deleteWithUndo(tasksRepo, task.id, "quest"); }}>Delete quest</button>
      </div>
    </Modal>
  );
}
