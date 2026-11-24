"use client";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { ArrowUpRight, Check, Fire, Gift, Headphones, Pause, Play } from "@phosphor-icons/react";
import { differenceInCalendarDays, parseISO, subDays, format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { BlobBackdrop, CurvedCorner, DashedAddTile, StickerCard } from "@/components/shapes";
import { Card, CardTitle, CountUp, Empty, IconBadge, Segmented } from "@/components/ui/misc";
import { useIsDesktop, useMedia } from "@/components/ui/useMedia";
import { db } from "@/core/db";
import { emit } from "@/core/events";
import { examsRepo, habitsRepo, notesRepo, tasksRepo } from "@/core/repos";
import { updateSettings, useGame, useSettings } from "@/core/settings";
import { useRows } from "@/features/shared/hooks";
import { RadialTimer } from "@/features/timer/RadialTimer";
import { useTimer } from "@/features/timer/useTimer";
import { HABIT_ICONS } from "@/features/habits/HabitsPage";
import { toggleHabit } from "@/features/habits/habitActions";
import { CHANNELS, useAmbient } from "@/lib/ambient";
import { startBinaural, stopBinaural } from "@/lib/binaural";
import { todayKey } from "@/lib/utils";
import { PRIORITY_COLOR } from "@/features/tasks/TaskEditor";
import { Lightning } from "@phosphor-icons/react";

export function ChestTile() {
  const s = useSettings();
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
  }, []);
  const ready = now > 0 && now - s.lastChest > 24 * 3600 * 1000;
  const open = async () => { const coins = 20 + Math.floor(Math.random() * 41); await updateSettings({ lastChest: Date.now() }); emit("chest.opened", { coins }); };
  const hrs = Math.max(0, Math.ceil((24 * 3600 * 1000 - ((now || s.lastChest) - s.lastChest)) / 3600000));
  return (
    <button onClick={() => void open()} disabled={!ready} className="tile flex items-center gap-3 border-[1.5px] border-line bg-peach text-left text-ink disabled:opacity-70" aria-label="Daily treasure chest">
      <IconBadge color="#FF8B4A"><Gift size={24} weight="duotone" /></IconBadge>
      <span><span className="block text-sm font-bold">Daily chest</span><span className="block text-xs">{ready ? "Ready. Tap to open" : `Resets in ${hrs}h`}</span></span>
    </button>
  );
}
function ExamTile() {
  const exams = useRows(examsRepo) ?? [];
  const next = exams.map((e) => ({ e, d: differenceInCalendarDays(parseISO(e.date), new Date()) })).filter((x) => x.d >= 0).sort((a, b) => a.d - b.d)[0];
  const color = !next ? "var(--soft)" : next.d > 30 ? "#1FD6C1" : next.d >= 7 ? "#FFB020" : "#FF5A4A";
  return (
    <Link href="/exams" className="tile flex items-center gap-3 border-[1.5px] border-line text-ink" style={{ background: color }}>
      <span className="font-display num text-4xl leading-none">{next ? next.d : "-"}</span>
      <span className="min-w-0 text-xs font-bold">{next ? <>days to <span className="block truncate text-sm">{next.e.title}</span></> : "No exam set. Add one"}</span>
    </Link>
  );
}
export function FlowStation({ hidden, onPicker }: { hidden: string[]; onPicker: () => void }) {
  const t = useTimer();
  const g = useGame();
  const desktop = useIsDesktop();
  const mobile = useMedia("(max-width: 639px)");
  const size = desktop ? 250 : mobile ? 210 : 150;
  const preset = (mins: number, kind: "focus" | "long") => { t.setKind(kind); t.setMins(kind, mins); };
  return (
    <Card className="gap-3 overflow-hidden">
      <BlobBackdrop preset={0} color="var(--color-lavender)" className="-bottom-24 -left-16 size-96" />
      <CurvedCorner><Link href="/timer" aria-label="Open focus page" className="grid size-9 place-items-center rounded-full bg-ink text-paper"><ArrowUpRight size={18} weight="bold" /></Link></CurvedCorner>
      <CardTitle sub="Pick a block, press start. XP lands when it ends.">Flow Station</CardTitle>
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto sm:flex-row sm:items-center sm:justify-around">
        <div className="flex flex-col items-center gap-3">
          <RadialTimer pct={t.pct} rem={t.rem} label={t.kind === "focus" ? "Focus" : t.kind === "short" ? "Break" : "Long break"} size={size} stroke={size > 200 ? 16 : 12} />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button className="btn btn-lime" onClick={t.running ? t.pause : t.start}>{t.running ? <><Pause size={18} weight="fill" />Pause</> : <><Play size={18} weight="fill" />Start</>}</button>
            <button className="chip" onClick={() => preset(25, "focus")}>25</button><button className="chip" onClick={() => preset(50, "focus")}>50</button><button className="chip" onClick={() => preset(15, "long")}>15 break</button>
          </div>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-3 sm:max-w-[260px]">
          {!hidden.includes("streak") && (
            <StickerCard className="flex items-center gap-3"><Fire size={34} weight="fill" /><div><p className="font-display num text-4xl leading-none"><CountUp value={g.streak} /></p><p className="text-xs font-bold">day streak · best {g.bestStreak}</p></div></StickerCard>
          )}
          {!hidden.includes("chest") && <ChestTile />}
          {!hidden.includes("exam") && <ExamTile />}
          <DashedAddTile label="Add widget" onClick={onPicker} />
        </div>
      </div>
    </Card>
  );
}
export function QuestsCard() {
  const tasks = useRows(tasksRepo) ?? [];
  const habits = useRows(habitsRepo) ?? [];
  const logs = useLiveQuery(() => db.habitLogs.toArray(), [], []);
  const [tab, setTab] = useState<"active" | "daily">("active");
  const today = todayKey();
  const active = tasks.filter((t) => t.status !== "done").sort((a, b) => a.order - b.order);
  return (
    <Card className="gap-3">
      <CardTitle right={<Segmented value={tab} onChange={setTab} options={[{ value: "active", label: "Active" }, { value: "daily", label: "Daily" }]} />}>Quests</CardTitle>
      <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-2">
        {tab === "active" ? (
          active.length === 0 ? <Empty title="Board is clear" hint="Add a quest to start earning XP." action={<Link className="btn btn-lime btn-sm" href="/tasks">Open quests</Link>} /> :
          active.map((t) => (
            <button key={t.id} onClick={() => void tasksRepo.update(t.id, { status: "done", completedAt: Date.now() }).then(() => emit("task.completed", { priority: t.priority, title: t.title }))} className="tile flex min-h-12 items-center gap-3 text-left" aria-label={`Complete ${t.title}`}>
              <span className="grid size-6 shrink-0 place-items-center rounded-full border-[1.5px] border-line" style={{ background: PRIORITY_COLOR[t.priority] }}><Check size={12} weight="bold" className="text-ink" /></span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{t.title}</span>
              {t.due && <span className="num text-xs text-muted">{format(parseISO(t.due), "d MMM")}</span>}
            </button>
          ))
        ) : habits.length === 0 ? <Empty title="No daily habits" hint="Habits show up here for one-tap check-ins." action={<Link className="btn btn-lime btn-sm" href="/habits">Add habit</Link>} /> :
          habits.map((h) => {
            const on = logs.some((l) => l.habitId === h.id && l.date === today);
            const Ic = HABIT_ICONS[h.icon] ?? Lightning;
            return (
              <button key={h.id} aria-pressed={on} onClick={() => void toggleHabit(h.id, h.name)} className="tile flex min-h-12 items-center gap-3 text-left">
                <IconBadge color={h.color} className="!size-9 !rounded-xl"><Ic size={18} weight="duotone" /></IconBadge>
                <span className={`flex-1 truncate text-sm font-bold ${on ? "line-through opacity-60" : ""}`}>{h.name}</span>
                <span className={`grid size-6 place-items-center rounded-full border-[1.5px] border-line ${on ? "bg-lime text-ink" : ""}`}>{on && <Check size={12} weight="bold" />}</span>
              </button>
            );
          })}
      </div>
    </Card>
  );
}
export function VelocityCard() {
  const logs = useLiveQuery(() => db.studyLogs.toArray(), [], []);
  const s = useSettings();
  const data = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = subDays(new Date(), 6 - i); const k = todayKey(d); return { day: format(d, "EEE"), min: logs.filter((l) => l.date === k && !l.deletedAt).reduce((a, l) => a + l.minutes, 0) }; }), [logs]);
  const total = data.reduce((a, d) => a + d.min, 0);
  return (
    <Card className="gap-2">
      <CardTitle sub={`Goal ${s.focusGoalMin} min a day`} right={<span className="font-display num text-2xl">{(total / 60).toFixed(1)}h</span>}>Study velocity</CardTitle>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%" minHeight={60}>
          <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted)" }} />
            <Tooltip cursor={false} formatter={(v) => [`${v} min`, "Focus"]} contentStyle={{ borderRadius: 16, border: "1.5px solid var(--line)", background: "var(--surface)", color: "var(--fg)" }} />
            <ReferenceLine y={s.focusGoalMin} stroke="#FF8B4A" strokeDasharray="4 4" />
            <Bar dataKey="min" fill="#D9FF45" stroke="#0b0b0c" strokeWidth={1.5} radius={[10, 10, 10, 10]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
export function LoFiCard() {
  const { vols, preset, stopAll } = useAmbient();
  const playing = CHANNELS.some((c) => vols[c.id] > 0);
  const [bin, setBin] = useState(false);
  return (
    <Card className="justify-between gap-2">
      <CardTitle sub="Rain and cafe murmur, synthesised on your device.">Lo-Fi</CardTitle>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-lime btn-icon" aria-label={playing ? "Pause lo-fi" : "Play lo-fi"} onClick={() => (playing ? stopAll() : preset({ rain: 0.5, cafe: 0.3 }))}>{playing ? <Pause weight="fill" size={20} /> : <Play weight="fill" size={20} />}</button>
        <button className={`chip ${bin ? "bg-teal text-ink" : ""}`} aria-pressed={bin} onClick={() => { if (bin) stopBinaural(); else startBinaural("alpha", 0.5); setBin(!bin); }}><Headphones size={14} weight="bold" />Alpha 10Hz{bin ? " on" : ""}</button>
      </div>
    </Card>
  );
}
export function NotesDeck() {
  const notes = (useRows(notesRepo) ?? []).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);
  return (
    <Card className="gap-2 overflow-hidden">
      <CardTitle right={<Link href="/notes" className="btn btn-sm">All notes</Link>}>Notes deck</CardTitle>
      {notes.length === 0 ? <Empty title="No notes yet" action={<Link href="/notes" className="btn btn-lime btn-sm">Write one</Link>} /> : (
        <div className="relative min-h-0 flex-1">
          {notes.map((n, i) => (
            <Link key={n.id} href={`/notes?id=${n.id}`} className="absolute top-1 w-[58%] rounded-[20px] border-[1.5px] border-line bg-soft p-3 shadow-md transition hover:z-10 hover:-translate-y-1" style={{ left: `${i * 20}%`, transform: `rotate(${(i - 1) * 7}deg)`, zIndex: i }}>
              <p className="truncate text-sm font-bold">{n.title || "Untitled"}</p><p className="line-clamp-2 text-xs text-muted">{n.content.replace(/[#*>`-]/g, "").slice(0, 80)}</p>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
