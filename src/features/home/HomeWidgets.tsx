"use client";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { ArrowUpRight, Check, Fire, Gift, Headphones, Pause, Play, Plus } from "@phosphor-icons/react";
import { differenceInCalendarDays, parseISO, subDays, format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BlobBackdrop, CurvedCorner, StickerCard } from "@/components/shapes";
import { BentoCard } from "@/components/shell/BentoCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CountUp, Empty, IconBadge, Segmented } from "@/components/ui/misc";
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
  const open = async () => {
    const coins = 20 + Math.floor(Math.random() * 41);
    await updateSettings({ lastChest: Date.now() });
    emit("chest.opened", { coins });
  };
  const hrs = Math.max(0, Math.ceil((24 * 3600 * 1000 - ((now || s.lastChest) - s.lastChest)) / 3600000));
  return (
    <button
      onClick={() => void open()}
      disabled={!ready}
      className="inline-flex items-center gap-2 rounded-full border border-line bg-peach/30 px-3 py-1.5 text-left text-ink transition hover:bg-peach/60 disabled:opacity-60"
      aria-label="Daily treasure chest"
    >
      <Gift size={18} weight="duotone" className="text-orange" />
      <span className="text-xs font-bold">{ready ? "Open chest" : `Chest in ${hrs}h`}</span>
    </button>
  );
}

export function ExamTile() {
  const exams = useRows(examsRepo) ?? [];
  const next = exams
    .map((e) => ({ e, d: differenceInCalendarDays(parseISO(e.date), new Date()) }))
    .filter((x) => x.d >= 0)
    .sort((a, b) => a.d - b.d)[0];
  const color = !next ? "var(--color-muted)" : next.d > 30 ? "#1FD6C1" : next.d >= 7 ? "#FFB020" : "#FF5A4A";

  return (
    <Link
      href="/exams"
      className="flex items-center justify-between rounded-2xl border border-line bg-surface/80 px-3 py-2 text-ink transition hover:bg-soft shadow-xs shrink-0"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="font-display num text-2xl font-black leading-none" style={{ color }}>
          {next ? next.d : "—"}
        </span>
        <span className="min-w-0 text-xs font-bold truncate">
          {next ? (
            <>
              days to <span className="underline decoration-ink/30">{next.e.title}</span>
            </>
          ) : (
            "No exam scheduled. Add one"
          )}
        </span>
      </div>
      <ArrowUpRight size={14} className="text-muted shrink-0 ml-1" />
    </Link>
  );
}

export function FlowStation({ hidden, onPicker }: { hidden: string[]; onPicker: () => void }) {
  const t = useTimer();
  const g = useGame();
  const preset = (mins: number, kind: "focus" | "long") => {
    t.setKind(kind);
    t.setMins(kind, mins);
  };

  return (
    <BentoCard
      title="Flow Station"
      subtitle="Pick a block, press start. XP lands when it ends."
      action={
        <div className="flex items-center gap-2 pr-12">
          {!hidden.includes("streak") && (
            <StickerCard className="hidden sm:flex items-center gap-1.5 py-1 px-2.5 text-xs rotate-2">
              <Fire size={16} weight="fill" className="text-orange" />
              <span className="font-bold num">{g.streak}d streak</span>
            </StickerCard>
          )}
          <CurvedCorner>
            <Link href="/timer" aria-label="Open focus page" className="grid size-8 place-items-center rounded-full bg-ink text-paper transition hover:scale-105">
              <ArrowUpRight size={16} weight="bold" />
            </Link>
          </CurvedCorner>
        </div>
      }
      decorations={<BlobBackdrop preset={0} color="var(--color-lavender)" className="-bottom-20 -left-12 size-80 pointer-events-none opacity-40" />}
      className="h-full gap-2"
    >
      <div className="flex h-full w-full flex-col items-center justify-around gap-3 sm:flex-row sm:justify-evenly py-1">
        <div className="flex h-full max-h-[230px] w-full sm:w-auto items-center justify-center">
          <RadialTimer
            pct={t.pct}
            rem={t.rem}
            running={t.running}
            label={t.kind === "focus" ? "Focus" : t.kind === "short" ? "Break" : "Long break"}
          />
        </div>

        <div className="flex flex-col items-center justify-center gap-3 shrink-0">
          {/* Row 1: Start button + segmented preset control */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              className="btn btn-lime px-6 py-2 text-sm sm:text-base font-bold shadow-sm transition hover:scale-105 active:scale-95"
              onClick={t.running ? t.pause : t.start}
            >
              {t.running ? <><Pause size={18} weight="fill" /> Pause</> : <><Play size={18} weight="fill" /> Start</>}
            </button>
            <div className="inline-flex rounded-full border-[1.5px] border-line bg-soft p-1">
              <button className={`rounded-full px-3 py-1 text-xs font-bold transition ${t.kind === "focus" && t.mins.focus === 25 ? "bg-ink text-paper" : "text-muted hover:text-fg"}`} onClick={() => preset(25, "focus")}>25m</button>
              <button className={`rounded-full px-3 py-1 text-xs font-bold transition ${t.kind === "focus" && t.mins.focus === 50 ? "bg-ink text-paper" : "text-muted hover:text-fg"}`} onClick={() => preset(50, "focus")}>50m</button>
              <button className={`rounded-full px-3 py-1 text-xs font-bold transition ${t.kind === "long" ? "bg-ink text-paper" : "text-muted hover:text-fg"}`} onClick={() => preset(15, "long")}>15m</button>
            </div>
          </div>

          {/* Row 2: Chest tile + Exam radar tile */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {!hidden.includes("chest") && <ChestTile />}
            {!hidden.includes("exam") && <ExamTile />}
            <button
              onClick={onPicker}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-line/60 px-3 py-1.5 text-xs font-bold text-muted hover:border-ink hover:text-fg transition"
              aria-label="Customize widgets"
            >
              <Plus size={13} weight="bold" /> Widgets
            </button>
          </div>
        </div>
      </div>
    </BentoCard>
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
    <BentoCard
      title="Quests"
      action={<Segmented value={tab} onChange={setTab} options={[{ value: "active", label: "Active" }, { value: "daily", label: "Daily" }]} />}
      className="h-full gap-2 bg-peach/15"
    >
      <div className="flex h-full min-h-0 flex-1 flex-col gap-2">

        <ScrollArea className="flex-1 min-h-0 pr-1">
          <div className="flex flex-col gap-1.5 pb-1">
            {tab === "active" ? (
              active.length === 0 ? (
                <Empty
                  title="Board is clear"
                  hint="Add a quest to start earning XP."
                  action={<Link className="btn btn-lime btn-sm" href="/tasks">Open quests</Link>}
                />
              ) : (
                active.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => void tasksRepo.update(t.id, { status: "done", completedAt: Date.now() }).then(() => emit("task.completed", { priority: t.priority, title: t.title }))}
                    className="tile flex min-h-11 items-center gap-2.5 text-left p-2.5 transition hover:bg-soft"
                    aria-label={`Complete ${t.title}`}
                  >
                    <span className="grid size-5.5 shrink-0 place-items-center rounded-full border-[1.5px] border-line" style={{ background: PRIORITY_COLOR[t.priority] }}>
                      <Check size={11} weight="bold" className="text-ink" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs sm:text-sm font-bold">{t.title}</span>
                    {t.due && <span className="num text-[11px] text-muted shrink-0">{format(parseISO(t.due), "d MMM")}</span>}
                  </button>
                ))
              )
            ) : habits.length === 0 ? (
              <Empty
                title="No daily habits"
                hint="Habits show up here for one-tap check-ins."
                action={<Link className="btn btn-lime btn-sm" href="/habits">Add habit</Link>}
              />
            ) : (
              habits.map((h) => {
                const on = logs.some((l) => l.habitId === h.id && l.date === today);
                const Ic = HABIT_ICONS[h.icon] ?? Lightning;
                return (
                  <button
                    key={h.id}
                    aria-pressed={on}
                    onClick={() => void toggleHabit(h.id, h.name)}
                    className="tile flex min-h-11 items-center gap-2.5 text-left p-2.5 transition hover:bg-soft"
                  >
                    <IconBadge color={h.color} className="!size-8 !rounded-xl">
                      <Ic size={16} weight="duotone" />
                    </IconBadge>
                    <span className={`flex-1 truncate text-xs sm:text-sm font-bold ${on ? "line-through opacity-60" : ""}`}>{h.name}</span>
                    <span className={`grid size-5.5 place-items-center rounded-full border-[1.5px] border-line ${on ? "bg-lime text-ink" : ""}`}>
                      {on && <Check size={11} weight="bold" />}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </BentoCard>
  );
}

export function VelocityCard() {
  const logs = useLiveQuery(() => db.studyLogs.toArray(), [], []);
  const s = useSettings();
  const data = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      const k = todayKey(d);
      const min = (logs ?? []).filter((l) => l.date === k && !l.deletedAt).reduce((a, l) => a + l.minutes, 0);
      return {
        day: format(d, "EEE"),
        min,
        displayMin: min > 0 ? min : Math.max(4, Math.round(s.focusGoalMin * 0.04)),
        isEmpty: min === 0,
        isToday: i === 6,
      };
    });
  }, [logs, s.focusGoalMin]);

  const total = data.reduce((a, d) => a + d.min, 0);
  const maxDomain = Math.max(s.focusGoalMin, ...data.map((d) => d.min));

  return (
    <BentoCard
      title="Study velocity"
      subtitle={`Goal ${s.focusGoalMin}m / day`}
      action={<span className="font-display num text-base sm:text-lg font-bold text-teal">{(total / 60).toFixed(1)}h</span>}
      className="h-full gap-0.5"
    >
      <div className="h-full min-h-0 w-full flex-1 pt-0.5">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
            <YAxis hide domain={[0, maxDomain]} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              height={14}
              dy={1}
              tick={{ fontSize: 9.5, fill: "var(--color-muted)", fontWeight: 700 }}
            />
            <Tooltip
              cursor={false}
              formatter={(_v, _n, item) => [`${(item?.payload as { min: number })?.min ?? 0} min`, "Focus"]}
              contentStyle={{
                borderRadius: 12,
                border: "1.5px solid var(--color-line)",
                background: "var(--color-surface)",
                color: "var(--color-fg)",
                fontSize: 12,
                padding: "4px 8px"
              }}
            />
            <ReferenceLine y={s.focusGoalMin} stroke="#1FD6C1" strokeDasharray="3 3" />
            <Bar dataKey="displayMin" radius={[6, 6, 6, 6]}>
              {data.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={entry.isToday ? "#D9FF45" : "color-mix(in srgb, var(--fg) 15%, transparent)"}
                  stroke={entry.isToday ? "#0b0b0c" : "transparent"}
                  strokeWidth={entry.isToday ? 1.2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </BentoCard>
  );
}

export function LoFiCard() {
  const { vols, preset, stopAll } = useAmbient();
  const playing = CHANNELS.some((c) => vols[c.id] > 0);
  const [bin, setBin] = useState(false);

  return (
    <BentoCard
      title="Lo-Fi"
      subtitle="Rain and cafe murmur, local on device."
      className="h-full gap-2"
    >
      <div className="flex h-full w-full items-center justify-center gap-3">
        <button
          className="btn btn-lime btn-icon size-11"
          aria-label={playing ? "Pause lo-fi" : "Play lo-fi"}
          onClick={() => (playing ? stopAll() : preset({ rain: 0.5, cafe: 0.3 }))}
        >
          {playing ? <Pause weight="fill" size={20} /> : <Play weight="fill" size={20} />}
        </button>
        <button
          className={`chip text-xs ${bin ? "bg-teal text-ink font-bold" : ""}`}
          aria-pressed={bin}
          onClick={() => {
            if (bin) stopBinaural();
            else startBinaural("alpha", 0.5);
            setBin(!bin);
          }}
        >
          <Headphones size={15} weight="bold" />
          Alpha 10Hz{bin ? " on" : ""}
        </button>
      </div>
    </BentoCard>
  );
}

export function NotesDeck({ onPicker }: { onPicker?: () => void }) {
  const notes = (useRows(notesRepo) ?? []).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);

  return (
    <BentoCard
      title="Notes deck"
      action={
        <div className="flex items-center gap-1.5">
          {onPicker && (
            <button
              onClick={onPicker}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-line/60 px-2.5 py-1 text-[11px] font-bold text-muted hover:border-ink hover:text-fg transition"
              aria-label="Add widget"
            >
              <Plus size={12} weight="bold" /> Add widget
            </button>
          )}
          <Link href="/notes" className="btn btn-sm text-xs">All notes</Link>
        </div>
      }
      className="h-full gap-1 overflow-hidden bg-lavender/25"
    >
      {notes.length === 0 ? (
        <Empty
          title="No notes yet"
          hint="Create quick markdown study notes."
          action={<Link href="/notes" className="btn btn-lime btn-sm">Write one</Link>}
        />
      ) : (
        <div className="relative h-full min-h-0 w-full flex-1 pt-1">
          {notes.map((n, i) => (
            <Link
              key={n.id}
              href={`/notes?id=${n.id}`}
              className="absolute top-1 w-[55%] rounded-[18px] border-[1.5px] border-line bg-soft/90 p-2.5 shadow-sm transition hover:z-10 hover:-translate-y-1"
              style={{
                left: `${i * 22}%`,
                transform: `rotate(${(i - 1) * 5}deg)`,
                zIndex: i,
              }}
            >
              <p className="truncate text-xs font-bold">{n.title || "Untitled"}</p>
              <p className="line-clamp-2 text-[11px] text-muted">{n.content.replace(/[#*>`-]/g, "").slice(0, 60)}</p>
            </Link>
          ))}
        </div>
      )}
    </BentoCard>
  );
}
