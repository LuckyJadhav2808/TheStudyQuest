"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLiveQuery } from "dexie-react-hooks";
import { Barbell, BookOpen, Brain, Check, Coffee, Drop, Fire, Heart, Lightning, Moon, PersonSimpleRun, Plus, Sun, Trash, type Icon } from "@phosphor-icons/react";
import { subDays } from "date-fns";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Panels } from "@/components/shell/Panels";
import { Card, CardTitle, Empty, IconBadge, PageFrame, Skeleton } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { Field } from "@/components/ui/fields";
import { db } from "@/core/db";
import { emit } from "@/core/events";
import { habitLogsRepo, habitsRepo } from "@/core/repos";
import { deleteWithUndo, useRows } from "@/features/shared/hooks";
import { todayKey } from "@/lib/utils";
import { streaks } from "./habitUtils";

export const HABIT_ICONS: Record<string, Icon> = { Lightning, BookOpen, Barbell, Drop, Moon, Brain, Heart, Coffee, Sun, PersonSimpleRun };
const COLORS = ["#D9FF45", "#FF8B4A", "#1FD6C1", "#E8E4FF", "#FFE2D2", "#2E8BFF"];
const schema = z.object({ name: z.string().min(1, "Give it a name").max(40) });

function Heat({ days, color }: { days: Set<string>; color: string }) {
  const cells = Array.from({ length: 84 }, (_, i) => todayKey(subDays(new Date(), 83 - i)));
  return <div className="grid grid-flow-col grid-rows-7 gap-[3px]" aria-label="12 week heatmap">{cells.map((k) => <span key={k} title={k} className="size-3 rounded-[4px] border border-line/10" style={{ background: days.has(k) ? color : "var(--soft)" }} />)}</div>;
}
export function HabitsPage() {
  const habits = useRows(habitsRepo);
  const logs = useLiveQuery(() => db.habitLogs.toArray(), [], []);
  const shield = useLiveQuery(async () => (await db.buffs.toArray()).some((b) => b.kind === "shield" && b.expiresAt > Date.now()), [], false);
  const [open, setOpen] = useState(false);
  const [icon, setIcon] = useState("Lightning");
  const [color, setColor] = useState(COLORS[0]);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ name: string }>({ resolver: zodResolver(schema) });
  const today = todayKey();
  if (!habits) return <PageFrame title="Habits" subtitle="Loading"><Skeleton className="flex-1" /></PageFrame>;
  async function toggle(id: string, name: string) {
    const ex = logs.find((l) => l.habitId === id && l.date === today);
    if (ex) { await habitLogsRepo.remove(ex.id); return; }
    await habitLogsRepo.add({ habitId: id, date: today } as never);
    const all = await db.habitLogs.toArray();
    emit("habit.checked", { name, streak: streaks(all, id, shield).current });
  }
  const doneToday = habits.filter((h) => logs.some((l) => l.habitId === h.id && l.date === today)).length;
  const list = (
    <Card className="gap-3">
      <CardTitle sub={`${doneToday} of ${habits.length} done today`} right={shield ? <span className="chip bg-teal text-ink">Shield on</span> : undefined}>Daily habits</CardTitle>
      <div className="scroll-thin grid min-h-0 flex-1 content-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {habits.length === 0 && <div className="col-span-full"><Empty title="No habits yet" hint="Small daily reps compound. Add your first one." action={<button className="btn btn-lime" onClick={() => setOpen(true)}>Add habit</button>} /></div>}
        {habits.map((h) => {
          const Ic = HABIT_ICONS[h.icon] ?? Lightning;
          const on = logs.some((l) => l.habitId === h.id && l.date === today);
          const st = streaks(logs, h.id, shield);
          const days = new Set(logs.filter((l) => l.habitId === h.id).map((l) => l.date));
          return (
            <div key={h.id} className="tile flex flex-col gap-3 border border-line/20 bg-surface">
              <div className="flex items-center gap-3">
                <IconBadge color={h.color}><Ic size={22} weight="duotone" /></IconBadge>
                <div className="min-w-0 flex-1"><p className="truncate font-bold">{h.name}</p><p className="num flex items-center gap-1 text-xs text-muted"><Fire size={13} weight="fill" className="text-orange" />{st.current} now · best {st.best}</p></div>
                <button aria-label={on ? `Uncheck ${h.name}` : `Check ${h.name}`} aria-pressed={on} onClick={() => void toggle(h.id, h.name)} className={`grid size-11 place-items-center rounded-full border-[1.5px] border-line transition ${on ? "bg-lime text-ink" : "bg-surface"}`}><Check size={20} weight="bold" /></button>
              </div>
              <Heat days={days} color={h.color} />
              <button className="self-end text-xs font-semibold text-muted" onClick={() => void deleteWithUndo(habitsRepo, h.id, "habit")}><Trash size={14} className="mr-1 inline" />Remove</button>
            </div>
          );
        })}
      </div>
    </Card>
  );
  const side = (
    <Card className="gap-3">
      <CardTitle sub="Last 12 weeks, all habits">Consistency</CardTitle>
      <p className="font-display num text-5xl">{habits.length ? Math.round((doneToday / habits.length) * 100) : 0}%</p>
      <p className="text-sm text-muted">of today's habits complete. A streak shield from Alchemy forgives one missed day.</p>
      <Heat days={new Set(logs.map((l) => l.date))} color="var(--color-teal)" />
    </Card>
  );
  return (
    <PageFrame title="Habits" subtitle="One tap a day. Streaks do the rest." actions={<button className="btn btn-lime" onClick={() => setOpen(true)}><Plus size={18} weight="bold" />New habit</button>}>
      <Panels className="lg:grid-cols-12" panels={[{ id: "list", label: "Today", className: "lg:col-span-9", node: list }, { id: "side", label: "Overview", className: "lg:col-span-3", node: side }]} />
      <Modal open={open} onClose={() => setOpen(false)} title="New habit">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(async (d) => { await habitsRepo.add({ name: d.name, icon, color }); reset(); setOpen(false); })}>
          <Field label="Name"><input className="input" autoFocus {...register("name")} placeholder="Read 20 pages" />{errors.name && <span className="text-xs text-red-600">{errors.name.message}</span>}</Field>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Icon">{Object.entries(HABIT_ICONS).map(([k, Ic]) => <button type="button" key={k} role="radio" aria-checked={icon === k} aria-label={k} onClick={() => setIcon(k)} className={`grid size-11 place-items-center rounded-2xl border-[1.5px] ${icon === k ? "border-line bg-lime text-ink" : "border-transparent bg-soft"}`}><Ic size={22} weight="duotone" /></button>)}</div>
          <div className="flex gap-2" role="radiogroup" aria-label="Colour">{COLORS.map((c) => <button type="button" key={c} role="radio" aria-checked={color === c} aria-label={c} onClick={() => setColor(c)} className="size-9 rounded-full border-2" style={{ background: c, borderColor: color === c ? "var(--fg)" : "transparent" }} />)}</div>
          <button className="btn btn-lime" type="submit">Create habit</button>
        </form>
      </Modal>
    </PageFrame>
  );
}
