"use client";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import NumberFlow from "@number-flow/react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ArrowUpRight, Cards, Check, Fire, Gift, Headphones, Pause, Play, Plus } from "@phosphor-icons/react";
import { differenceInCalendarDays, parseISO, subDays, format } from "date-fns";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BlobBackdrop, CurvedCorner, StickerCard } from "@/components/shapes";
import { BentoCard } from "@/components/shell/BentoCard";
import { DeferredMount } from "@/components/ui/DeferredMount";
import { HeroCard } from "@/components/ui/design-primitives";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Empty, IconBadge, ProgressBar, Segmented, TickGauge } from "@/components/ui/misc";
import { Illustration } from "@/components/illustrations/Illustration";
import { GenerativeCover } from "@/components/illustrations/GenerativeCover";
import { StrobiFace } from "@/features/strobi/StrobiFace";
import { db } from "@/core/db";
import { emit } from "@/core/events";
import { examsRepo, flashcardsRepo, habitsRepo, notesRepo, tasksRepo } from "@/core/repos";
import { updateSettings, useGame, useSettings } from "@/core/settings";
import { useRows } from "@/features/shared/hooks";
import { RadialTimer } from "@/features/timer/RadialTimer";
import { useTimer } from "@/features/timer/useTimer";
import { HABIT_ICONS } from "@/features/habits/HabitsPage";
import { toggleHabit } from "@/features/habits/habitActions";
import { CHANNELS, useAmbient } from "@/lib/ambient";
import { useYtMusic, ytThumb } from "@/lib/ytMusic";
import { todayKey } from "@/lib/utils";
import { PRIORITY_COLOR } from "@/features/tasks/TaskEditor";
import { Lightning } from "@phosphor-icons/react";

const emptySubscribe = () => () => {};
let cachedClientNow = 0;
const getClientNow = () => (cachedClientNow ||= Date.now());

export function ChestTile() {
  const s = useSettings();
  const now = useSyncExternalStore(emptySubscribe, getClientNow, () => 0);
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
      className={`inline-flex items-center gap-2 rounded-full border border-border-strong/30 bg-[var(--warning-tint)] px-3 py-1.5 text-left text-[var(--warning-text)] transition hover:brightness-95 disabled:opacity-60 ${
        ready ? "ring-2 ring-primary/80 animate-pulse" : ""
      }`}
      aria-label="Daily treasure chest"
    >
      <Gift size={18} weight="duotone" />
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
  const color = !next ? "var(--muted)" : next.d > 30 ? "var(--domain-stats-fill)" : next.d >= 7 ? "var(--warning)" : "var(--danger)";

  return (
    <Link
      href="/exams"
      className="flex items-center justify-between rounded-2xl border border-line bg-soft px-3 py-2 text-fg transition hover:bg-surface/15 shadow-xs shrink-0"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {next ? (
          <span className="font-display num text-2xl font-black leading-none" style={{ color }}>
            <NumberFlow value={next.d} />
          </span>
        ) : (
          <Illustration name="calendar" tone="quests" className="w-7 h-6" />
        )}
        <span className="min-w-0 text-xs font-bold truncate">
          {next ? (
            <>
              days to <span className="underline decoration-current/30">{next.e.title}</span>
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
  const s = useSettings();
  const today = todayKey();
  const logs = useLiveQuery(() => db.studyLogs.where("date").equals(today).toArray(), [today], []);
  const todayMin = (logs ?? []).filter((l) => !l.deletedAt).reduce((a, l) => a + l.minutes, 0);
  const preset = (mins: number, kind: "focus" | "long") => {
    t.setKind(kind);
    t.setMins(kind, mins);
  };

  return (
    <HeroCard
      tint="focus"
      hardShadow
      title="Flow Station"
      subtitle="Pick a block, press start. XP lands when it ends."
      action={
        <div className="flex items-center gap-2 pr-12">
          {!hidden.includes("streak") && (
            <StickerCard className="hidden sm:flex items-center gap-1.5 py-1 px-2.5 text-xs rotate-2 bg-surface text-fg">
              <Fire size={16} weight="fill" className="text-[var(--domain-quests-fill)]" />
              <span className="font-bold num"><NumberFlow value={g.streak} />d streak</span>
            </StickerCard>
          )}
          <CurvedCorner>
            <Link href="/timer" aria-label="Open focus page" className="grid size-8 place-items-center rounded-full bg-surface-inverse text-on-inverse transition hover:scale-105">
              <ArrowUpRight size={16} weight="bold" />
            </Link>
          </CurvedCorner>
        </div>
      }
      className="h-full gap-2"
    >
      <div className="flex h-full w-full flex-col items-center justify-around gap-3 sm:flex-row sm:justify-evenly py-1">
        {/* Left column inside hero: Ring + Start button directly under time */}
        <div className="flex h-full min-h-0 flex-col items-center justify-center gap-2.5 flex-1">
          <div className="flex h-full min-h-0 max-h-[210px] w-full items-center justify-center">
            <RadialTimer
              pct={t.pct}
              rem={t.rem}
              running={t.running}
              label={t.kind === "focus" ? "Focus" : t.kind === "short" ? "Break" : "Long break"}
            />
          </div>
          <button
            className="btn btn-lime px-7 py-2 text-sm sm:text-base font-bold shadow-sm transition hover:scale-105 active:scale-95 shrink-0"
            onClick={t.running ? t.pause : t.start}
          >
            {t.running ? <><Pause size={18} weight="fill" /> Pause</> : <><Play size={18} weight="fill" /> Start</>}
          </button>
        </div>

        {/* Right column inside hero: Presets + Chest + Exam */}
        <div className="flex flex-col items-center sm:items-end justify-center gap-2.5 shrink-0">
          <div className="inline-flex rounded-full border-[1.5px] border-border-strong bg-surface p-1 shadow-2xs">
            <button className={`rounded-full px-3.5 py-1 text-xs font-bold transition ${t.kind === "focus" && t.mins.focus === 25 ? "bg-surface-inverse text-on-inverse" : "text-muted hover:text-fg"}`} onClick={() => preset(25, "focus")}>25m</button>
            <button className={`rounded-full px-3.5 py-1 text-xs font-bold transition ${t.kind === "focus" && t.mins.focus === 50 ? "bg-surface-inverse text-on-inverse" : "text-muted hover:text-fg"}`} onClick={() => preset(50, "focus")}>50m</button>
            <button className={`rounded-full px-3.5 py-1 text-xs font-bold transition ${t.kind === "long" ? "bg-surface-inverse text-on-inverse" : "text-muted hover:text-fg"}`} onClick={() => preset(15, "long")}>15m</button>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
            {!hidden.includes("chest") && <ChestTile />}
            <button
              onClick={onPicker}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-line bg-soft px-3 py-1.5 text-xs font-bold text-muted hover:text-fg transition"
              aria-label="Customize widgets"
            >
              <Plus size={13} weight="bold" /> Widgets
            </button>
          </div>

          {!hidden.includes("exam") && <ExamTile />}
          <div className="w-full max-w-52 rounded-2xl border border-line/40 bg-surface/80 px-3 py-2">
            <div className="flex items-center justify-between text-[11px] font-bold mb-1">
              <span className="text-muted">Today&apos;s goal</span>
              <span className="num text-fg"><NumberFlow value={todayMin} />/{s.focusGoalMin}m</span>
            </div>
            <ProgressBar pct={s.focusGoalMin > 0 ? Math.min(1, todayMin / s.focusGoalMin) : 0} className="!h-1.5" />
          </div>
          <Illustration name="desk" tone="focus" className="hidden xl:block w-24 h-14 opacity-80 mt-auto" />
        </div>
      </div>
    </HeroCard>
  );
}

export function QuestsCard() {
  const tasks = useRows(tasksRepo) ?? [];
  const habits = useRows(habitsRepo) ?? [];
  const logs = useLiveQuery(() => db.habitLogs.toArray(), [], []);
  const [tab, setTab] = useState<"active" | "daily">("active");
  const [listRef] = useAutoAnimate<HTMLDivElement>();
  const today = todayKey();
  const active = tasks.filter((t) => t.status !== "done").sort((a, b) => a.order - b.order);

  const CARD_FILL: Record<string, string> = {
    urgent: "var(--domain-quests-fill)",
    high: "var(--domain-quests-fill)",
    medium: "var(--domain-notes-fill)",
    low: "var(--domain-stats-fill)",
  };

  return (
    <BentoCard
      title={`Quests (${active.length})`}
      action={<Segmented value={tab} onChange={setTab} options={[{ value: "active", label: "Active" }, { value: "daily", label: "Daily" }]} />}
      className="h-full gap-2 surface-inverse"
    >
      <div className="flex h-full min-h-0 flex-1 flex-col gap-2">

        <ScrollArea className="flex-1 min-h-0 pr-1">
          <div ref={listRef} className="flex flex-col gap-2 pb-1">
            {tab === "active" ? (
              active.length === 0 ? (
                <Empty
                  title="Board is clear"
                  hint="Add a quest to start earning XP."
                  mood="cheer"
                  action={<Link className="btn btn-lime btn-sm" href="/tasks">Open quests</Link>}
                />
              ) : (
                active.map((t) => {
                  const doneSubs = t.subtasks.filter((s) => s.done).length;
                  const pct = t.subtasks.length > 0 ? doneSubs / t.subtasks.length : t.status === "doing" ? 0.55 : 0.2;
                  return (
                    <button
                      key={t.id}
                      onClick={() => void tasksRepo.update(t.id, { status: "done", completedAt: Date.now() }).then(() => emit("task.completed", { priority: t.priority, title: t.title }))}
                      className="flex flex-col gap-2 rounded-[22px] border border-border-strong/50 p-3 text-left text-on-primary transition hover:-translate-y-0.5 active:scale-[0.98]"
                      style={{ background: CARD_FILL[t.priority] ?? "var(--domain-quests-fill)" }}
                      aria-label={`Complete ${t.title}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="inline-flex items-center gap-1 rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-bold text-white">
                            <span className="size-1.5 rounded-full bg-primary" />
                            {t.status === "doing" ? "In progress" : t.priority}
                          </span>
                          <p className="mt-1 truncate text-sm font-extrabold leading-tight">{t.title}</p>
                        </div>
                        <span className="grid size-7 shrink-0 place-items-center rounded-full border border-black/30 bg-white/30">
                          <Check size={13} weight="bold" />
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ProgressBar pct={pct} variant="hatched" color="var(--on-primary)" className="!h-2 flex-1 !border-black/20 !bg-black/15" />
                        <span className="num text-[11px] font-extrabold">{t.due ? format(parseISO(t.due), "d MMM") : `${Math.round(pct * 100)}%`}</span>
                      </div>
                    </button>
                  );
                })
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
                    className="flex min-h-12 items-center gap-2.5 rounded-[20px] border border-black/20 p-2.5 text-left text-on-primary transition hover:-translate-y-0.5"
                    style={{ background: h.color }}
                  >
                    <IconBadge color="rgba(255,255,255,0.55)" className="!size-8 !rounded-xl">
                      <Ic size={16} weight="duotone" />
                    </IconBadge>
                    <span className={`flex-1 truncate text-xs sm:text-sm font-extrabold ${on ? "line-through opacity-60" : ""}`}>{h.name}</span>
                    <span className={`grid size-6 place-items-center rounded-full border-[1.5px] border-black/50 ${on ? "bg-black text-white" : "bg-white/40"}`}>
                      {on && <Check size={12} weight="bold" />}
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

const GHOST_BARS = [24, 48, 34, 62, 42, 54, 20];

export function VelocityCard() {
  const logs = useLiveQuery(() => db.studyLogs.toArray(), [], []);
  const s = useSettings();
  const raw = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      const k = todayKey(d);
      const min = (logs ?? []).filter((l) => l.date === k && !l.deletedAt).reduce((a, l) => a + l.minutes, 0);
      return {
        day: format(d, "EEE"),
        min,
        isToday: i === 6,
      };
    });
  }, [logs]);

  const total = raw.reduce((a, d) => a + d.min, 0);
  const allEmpty = total === 0;
  const data = raw.map((d, i) => ({
    ...d,
    displayMin: allEmpty ? GHOST_BARS[i] : d.min > 0 ? d.min : Math.max(4, Math.round(s.focusGoalMin * 0.04)),
  }));
  const maxDomain = Math.max(s.focusGoalMin, ...data.map((d) => d.displayMin));

  const todayMin = raw[6]?.min ?? 0;

  return (
    <BentoCard
      title="Study velocity"
      subtitle={allEmpty ? "Your week starts here." : `Goal ${s.focusGoalMin}m / day`}
      action={
        <div className="flex items-center gap-2">
          <TickGauge pct={s.focusGoalMin > 0 ? todayMin / s.focusGoalMin : 0} className="w-12" />
          <span className="font-display num text-base sm:text-lg font-bold text-[var(--domain-stats-fill)]">{(total / 60).toFixed(1)}h</span>
        </div>
      }
      className="h-full gap-0.5 surface-inverse relative"
    >
      {allEmpty && (
        <div className="pointer-events-none absolute right-3 bottom-7 z-10 opacity-85" aria-hidden>
          <StrobiFace mood="idle" size={28} />
        </div>
      )}
      <DeferredMount className="h-full min-h-0 w-full flex-1 pt-0.5">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
            <defs>
              <pattern id="sq-vel-hatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <rect width="6" height="6" fill="var(--primary)" />
                <line x1="0" y1="0" x2="0" y2="6" stroke="var(--on-primary)" strokeWidth="2.5" strokeOpacity="0.35" />
              </pattern>
            </defs>
            <YAxis hide domain={[0, maxDomain]} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              height={14}
              dy={1}
              tick={{ fontSize: 9.5, fill: "var(--muted)", fontWeight: 700 }}
            />
            <Tooltip
              cursor={false}
              formatter={(_v, _n, item) => [`${(item?.payload as { min: number })?.min ?? 0} min`, "Focus"]}
              contentStyle={{
                borderRadius: 12,
                border: "1.5px solid var(--border-strong)",
                background: "var(--surface)",
                color: "var(--fg)",
                fontSize: 12,
                padding: "4px 8px"
              }}
            />
            <ReferenceLine y={s.focusGoalMin} stroke="var(--domain-stats-fill)" strokeDasharray="3 3" />
            <Bar dataKey="displayMin" radius={[6, 6, 6, 6]}>
              {data.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={
                    allEmpty
                      ? "color-mix(in srgb, var(--fg) 14%, transparent)"
                      : entry.isToday
                      ? "url(#sq-vel-hatch)"
                      : "color-mix(in srgb, var(--fg) 22%, transparent)"
                  }
                  stroke={!allEmpty && entry.isToday ? "var(--primary)" : "transparent"}
                  strokeWidth={!allEmpty && entry.isToday ? 1.2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </DeferredMount>
    </BentoCard>
  );
}

const EQ_HEIGHTS = [42, 78, 56, 92, 64, 85, 48, 72];

export function LoFiCard() {
  const { vols, preset, stopAll } = useAmbient();
  const yt = useYtMusic();
  const playing = CHANNELS.some((c) => vols[c.id] > 0) || yt.playing;
  const activeTrack = yt.tracks.find((t) => t.id === yt.activeId) ?? yt.tracks[0];

  return (
    <BentoCard
      title="Lo-Fi"
      subtitle={yt.playing && activeTrack ? `YT · ${activeTrack.title}` : "Rain & Cafe · YT Music"}
      action={
        <button
          className={`chip !min-h-7 text-[11px] ${yt.playing ? "bg-teal text-ink font-bold" : ""}`}
          aria-pressed={yt.playing}
          disabled={!activeTrack}
          onClick={yt.toggle}
        >
          <Headphones size={13} weight="bold" />
          YT{yt.playing ? " on" : ""}
        </button>
      }
      className="h-full gap-2"
    >
      <div className="flex h-full w-full flex-col justify-between gap-2 pt-1">
        <div className="flex items-center gap-3">
          {yt.playing && ytThumb(activeTrack) ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={ytThumb(activeTrack)!}
              alt={activeTrack?.title ?? "Song cover"}
              className="size-10 shrink-0 rounded-xl border border-border-strong/50 object-cover"
            />
          ) : (
            <GenerativeCover seed={playing ? "lofi-live" : "lofi-idle"} tone="tools" playing={playing} className="size-10" />
          )}
          <button
            className="btn btn-lime btn-icon size-10 shrink-0"
            aria-label={playing ? "Pause lo-fi" : "Play lo-fi"}
            onClick={() => {
              if (yt.playing) yt.pause();
              else if (CHANNELS.some((c) => vols[c.id] > 0)) stopAll();
              else preset({ rain: 0.5, cafe: 0.3 });
            }}
          >
            {playing ? <Pause weight="fill" size={18} /> : <Play weight="fill" size={18} />}
          </button>

          {/* Equaliser bars (animate when playing, paused when stopped) */}
          <div className="flex h-9 flex-1 items-end gap-1.5 rounded-2xl bg-soft/70 px-3 py-1.5" aria-hidden>
            {EQ_HEIGHTS.map((h, i) => (
              <span
                key={i}
                className={`flex-1 rounded-full transition-all duration-300 ${playing ? "bg-lime border border-ink/50 animate-pulse" : "bg-fg/15"}`}
                style={{
                  height: playing ? `${h}%` : `${Math.round(h * 0.45)}%`,
                  animationDelay: `${i * 110}ms`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Progress track */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-muted">
          <span>{playing ? "LIVE" : "IDLE"}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-soft">
            <div className={`h-full rounded-full transition-all duration-500 ${playing ? "w-2/3 bg-teal" : "w-1/4 bg-fg/20"}`} />
          </div>
          <span>∞</span>
        </div>
      </div>
    </BentoCard>
  );
}

export function NotesDeck({ onPicker }: { onPicker?: () => void }) {
  const notes = (useRows(notesRepo) ?? []).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);
  const cards = useRows(flashcardsRepo) ?? [];
  const now = useSyncExternalStore(emptySubscribe, getClientNow, () => 0);
  const dueCount = now > 0 ? cards.filter((c) => c.due <= now).length : 0;

  return (
    <BentoCard
      title="Notes deck"
      action={
        <div className="flex items-center gap-1.5">
          {dueCount > 0 && (
            <Link
              href="/notes"
              className="chip !min-h-7 bg-primary text-on-primary text-[11px] font-extrabold inline-flex items-center gap-1"
              title="Due flashcards"
            >
              <Cards size={12} weight="duotone" /> <NumberFlow value={dueCount} /> due
            </Link>
          )}
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
      className="h-full gap-1 overflow-hidden bg-[var(--domain-notes-tint)]"
    >
      {notes.length === 0 ? (
        <div className="flex h-full items-center justify-between gap-3 rounded-2xl border border-dashed border-line/40 bg-surface/60 px-4 py-2">
          <div className="min-w-0">
            <p className="font-display text-sm font-extrabold">No notes yet</p>
            <p className="text-[11px] text-muted truncate">Quick markdown & KaTeX notes.</p>
          </div>
          <Link href="/notes" className="btn btn-lime btn-sm shrink-0">Write one</Link>
        </div>
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
