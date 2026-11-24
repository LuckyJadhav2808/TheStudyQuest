"use client";
import { format } from "date-fns";
import { useState } from "react";
import { Panels, type Panel } from "@/components/shell/Panels";
import { Modal } from "@/components/ui/modal";
import { PageFrame } from "@/components/ui/misc";
import { updateSettings, useSettings } from "@/core/settings";
import { Checkbox } from "@/components/ui/checkbox";
import { FlowStation, LoFiCard, NotesDeck, QuestsCard, VelocityCard } from "./HomeWidgets";

const WIDGETS = [["streak", "Streak sticker"], ["chest", "Daily chest"], ["exam", "Exam radar"], ["velocity", "Study velocity"], ["lofi", "Lo-Fi player"], ["notes", "Notes deck"]] as const;
const SPAN: Record<number, string> = { 1: "lg:col-span-12", 2: "lg:col-span-6", 3: "lg:col-span-4" };

export function Home() {
  const s = useSettings();
  const [picker, setPicker] = useState(false);
  const hidden = s.hiddenWidgets;
  const bottom: Panel[] = [];
  const add = (id: string, label: string, node: React.ReactNode) => { if (!hidden.includes(id)) bottom.push({ id, label, node }); };
  add("velocity", "Stats", <VelocityCard />);
  add("lofi", "Music", <LoFiCard />);
  add("notes", "Notes", <NotesDeck />);
  const span = SPAN[Math.max(1, bottom.length)];
  const panels: Panel[] = [
    { id: "flow", label: "Flow", className: "sm:col-span-2 lg:col-span-8 lg:row-span-4", node: <FlowStation hidden={hidden} onPicker={() => setPicker(true)} /> },
    { id: "quests", label: "Quests", className: "lg:col-span-4 lg:row-span-4", node: <QuestsCard hidden={hidden} /> },
    ...bottom.map((b) => ({ ...b, className: `${span} lg:row-span-2` })),
  ];
  return (
    <PageFrame title="Today" subtitle={`${format(new Date(), "EEEE, d MMMM")}. Make it count.`}>
      <Panels className="sm:grid-cols-2 sm:grid-rows-3 lg:grid-cols-12 lg:grid-rows-6" panels={panels} />
      <Modal open={picker} onClose={() => setPicker(false)} title="Dashboard widgets">
        <div className="flex flex-col gap-2">
          {WIDGETS.map(([id, label]) => (
            <label key={id} className="tile flex min-h-12 items-center gap-3 text-sm font-bold cursor-pointer">
              <Checkbox
                checked={!hidden.includes(id)}
                onCheckedChange={() => void updateSettings({ hiddenWidgets: hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id] })}
              />
              {label}
            </label>
          ))}
        </div>
      </Modal>
    </PageFrame>
  );
}
