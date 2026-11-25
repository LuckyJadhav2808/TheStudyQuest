"use client";
import { useState } from "react";
import { addDays } from "date-fns";
import { Modal } from "@/components/ui/modal";
import { Field, Select } from "@/components/ui/fields";
import { Segmented } from "@/components/ui/misc";
import { emit } from "@/core/events";
import { examsRepo, habitsRepo, notesRepo, tasksRepo } from "@/core/repos";
import type { Priority } from "@/core/types";
import { strobiSay } from "@/features/strobi/toast";
import { dynamicToastLine, parseQuickTask } from "@/lib/localNlp";
import { todayKey } from "@/lib/utils";
import { useUI, type QuickKind } from "./ui-store";

export function QuickAdd() {
  const { quickAdd, set } = useUI();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [date, setDate] = useState(todayKey(addDays(new Date(), 30)));
  const close = () => { set({ quickAdd: null }); setTitle(""); };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t || !quickAdd) return;
    if (quickAdd === "task") {
      const parsed = parseQuickTask(t);
      await tasksRepo.add({
        title: parsed.title,
        status: "todo",
        priority: parsed.priority ?? priority,
        due: parsed.due,
        tags: [],
        subtasks: [],
        order: Date.now(),
      });
      strobiSay(dynamicToastLine("Quest added", parsed.title), "tip");
      close();
      return;
    }
    if (quickAdd === "note") { await notesRepo.add({ title: t, content: `# ${t}\n\n`, tags: [] }); emit("note.created", { title: t }); }
    if (quickAdd === "habit") await habitsRepo.add({ name: t, icon: "Lightning", color: "var(--primary)" });
    if (quickAdd === "exam") await examsRepo.add({ title: t, date, checklist: [] });
    if (quickAdd !== "note") strobiSay(dynamicToastLine(`Added ${quickAdd}`, t), "tip");
    close();
  }
  return (
    <Modal open={quickAdd !== null} onClose={close} title="Quick add">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Segmented<QuickKind> value={quickAdd ?? "task"} onChange={(v) => set({ quickAdd: v })} options={[{ value: "task", label: "Quest" }, { value: "note", label: "Note" }, { value: "habit", label: "Habit" }, { value: "exam", label: "Exam" }]} />
        <Field label={quickAdd === "habit" ? "Habit name" : "Title"}><input autoFocus className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's the move?" /></Field>
        {quickAdd === "task" && <Field label="Priority"><Select value={priority} onChange={(v) => setPriority(v as Priority)} options={["low", "medium", "high", "urgent"].map((v) => ({ value: v, label: v }))} /></Field>}
        {quickAdd === "exam" && <Field label="Exam date"><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>}
        <button className="btn btn-lime" type="submit" disabled={!title.trim()}>Add it</button>
      </form>
    </Modal>
  );
}
