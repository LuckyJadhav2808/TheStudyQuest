"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Check,
  CloudSlash,
  Copy,
  Headphones,
  PaperPlaneTilt,
  Pause,
  Play,
  QrCode,
  SpeakerHigh,
  SpeakerSlash,
  Timer,
  UsersThree,
} from "@phosphor-icons/react";
import { SeededAvatar } from "@/components/illustrations/SeededAvatar";
import { Panels } from "@/components/shell/Panels";
import { BentoCard } from "@/components/shell/BentoCard";
import { HeroCard } from "@/components/ui/design-primitives";
import { Modal } from "@/components/ui/modal";
import { PageFrame, ProgressBar } from "@/components/ui/misc";
import { Switch } from "@/components/ui/switch";
import { db } from "@/core/db";
import { firebaseConfigured } from "@/core/firebase";
import { chatRepo } from "@/core/repos";
import { useSettings } from "@/core/settings";
import { strobiSay } from "@/features/strobi/toast";
import { useTimer } from "@/features/timer/useTimer";
import { useAmbient } from "@/lib/ambient";
import { cn, fmtClock, todayKey } from "@/lib/utils";

const ROOM_PRESETS = [
  { id: "rain" as const, label: "Rain" },
  { id: "cafe" as const, label: "Cafe" },
  { id: "forest" as const, label: "Forest" },
];

export function GroupsPage() {
  const s = useSettings();
  const timer = useTimer();
  const ambient = useAmbient();
  const code = useMemo(() => {
    let h = 7;
    for (const c of s.avatarSeed + s.name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return h.toString(36).toUpperCase().padStart(6, "X").slice(0, 6);
  }, [s.avatarSeed, s.name]);

  const thread = useLiveQuery(() => db.chatThreads.where("id").equals("guild-hall").first(), [], undefined);
  const logs = useLiveQuery(() => db.studyLogs.toArray(), [], []);
  const tasks = useLiveQuery(() => db.tasks.toArray(), [], []);
  const hab = useLiveQuery(() => db.habitLogs.toArray(), [], []);

  const [msg, setMsg] = useState("");
  const [selectedMember, setSelectedMember] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [roomOpen, setRoomOpen] = useState(true);
  const [shareProgress, setShareProgress] = useState(true);
  const [presetIdx, setPresetIdx] = useState(0);

  const today = todayKey();
  const focus = logs.filter((l) => l.date === today).reduce((a, l) => a + l.minutes, 0);
  const done = tasks.filter((t) => t.completedAt && todayKey(new Date(t.completedAt)) === today).length;
  const habToday = hab.filter((h) => h.date === today).length;

  const quests = [
    { t: "Guild focus: 60m", p: focus / 60, meta: `${focus}/60m` },
    { t: "Clear 3 quests", p: done / 3, meta: `${done}/3` },
    { t: "Check in a habit", p: habToday, meta: `${Math.min(1, habToday)}/1` },
  ];

  const allMembers = [
    {
      n: `${s.name} (you)`,
      seed: s.avatarSeed || s.name,
      role: timer.running ? `Focusing • ${fmtClock(timer.rem)}` : `${focus}m logged today`,
      on: true,
    },
  ];
  const onlineCount = allMembers.filter((m) => m.on).length;
  const activePreset = ROOM_PRESETS[presetIdx];
  const ambientPlaying = (ambient.vols[activePreset.id] ?? 0) > 0;

  async function send() {
    if (!msg.trim()) return;
    const m = { role: "user" as const, content: `${s.name}: ${msg.trim()}`, at: Date.now() };
    if (thread) await chatRepo.update(thread.id, { messages: [...thread.messages, m] });
    else await chatRepo.add({ id: "guild-hall", title: "Guild chat", persona: "guild", messages: [m] });
    setMsg("");
  }

  function copyInvite() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(code);
    }
    setCopied(true);
    strobiSay(`Invite code ${code} copied`);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function toggleAmbient() {
    if (ambientPlaying) ambient.stopAll();
    else ambient.preset({ [activePreset.id]: 0.45 });
  }

  function cyclePreset(dir: number) {
    const next = (presetIdx + dir + ROOM_PRESETS.length) % ROOM_PRESETS.length;
    setPresetIdx(next);
    if (ambientPlaying) ambient.preset({ [ROOM_PRESETS[next].id]: 0.45 });
  }

  const hero = (
    <HeroCard tint="stats" hardShadow className="h-full" bodyClassName="flex h-full min-h-0 flex-col justify-between gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-9 items-center justify-center rounded-xl border-[1.5px] border-border-strong bg-surface text-text">
            <UsersThree size={18} weight="duotone" />
          </span>
          <div>
            <h2 className="card-title leading-tight">Study Guild</h2>
            <p className="text-xs text-muted">{firebaseConfigured ? "Live cloud guild" : "Local study hall"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="pill border-[1.5px] border-border-strong bg-surface/90 text-xs font-bold">{onlineCount} online</span>
          <span className="pill border-[1.5px] border-border-strong bg-surface/90 text-xs font-bold num">{focus}m today</span>
          <span className="pill border-[1.5px] border-border-strong bg-surface/90 font-display text-xs font-bold num">#{code}</span>
          <span className="pill border-[1.5px] border-border-strong bg-surface/90 text-xs font-bold">
            {firebaseConfigured ? "Cloud sync" : <span className="inline-flex items-center gap-1"><CloudSlash size={13} />Local</span>}
          </span>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 items-center gap-3 rounded-2xl border-[1.5px] border-border-strong bg-surface/85 p-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Guild study hall</p>
          <p className="font-display text-2xl font-bold leading-tight num sm:text-3xl">
            {timer.running ? fmtClock(timer.rem) : `${focus}m`}
          </p>
          <p className="text-xs text-muted">
            {timer.running
              ? `Live focus sprint in progress (${onlineCount} active).`
              : firebaseConfigured
                ? "Combined guild focus logged today across active members."
                : "Your local study hall — share your invite code to study with friends."}
          </p>
        </div>
        <div className="flex items-center -space-x-2">
          {allMembers.filter((m) => m.on).map((m) => (
            <div key={m.n} className="rounded-full border-2 border-surface bg-surface p-0.5 shadow-sm" title={m.n}>
              <SeededAvatar seed={m.seed} size={36} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (timer.running ? timer.pause() : timer.start())}
            className="btn btn-primary gap-1.5"
          >
            <Timer size={16} weight="bold" />
            {timer.running ? "Pause sprint" : "Start guild focus"}
          </button>
          <button type="button" onClick={copyInvite} className="btn btn-ghost gap-1.5 bg-surface/80">
            {copied ? <Check size={15} weight="bold" /> : <Copy size={15} />}
            {copied ? "Copied" : `Code ${code}`}
          </button>
          <button
            type="button"
            onClick={() => setShowQr(true)}
            className="btn btn-ghost btn-icon bg-surface/80"
            aria-label="Show invite QR code"
            title="Show QR code"
          >
            <QrCode size={16} />
          </button>
        </div>
        <span className="text-xs font-medium text-muted">
          {roomOpen ? "Co-study room open" : "Room paused"}
        </span>
      </div>
    </HeroCard>
  );

  const roster = (
    <BentoCard
      title="Members"
      action={<span className="pill bg-primary text-on-primary text-xs font-bold num">{onlineCount}/{allMembers.length}</span>}
      className="h-full surface-inverse"
      bodyClassName="flex min-h-0 flex-1 flex-col justify-between gap-2.5"
    >
      <div className="scroll-thin min-h-0 flex-1 space-y-2 pr-0.5">
        {allMembers.map((m, i) => {
          const active = i === selectedMember;
          return (
            <button
              key={m.n}
              type="button"
              onClick={() => setSelectedMember(i)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-2xl border-[1.5px] px-2.5 py-2 text-left transition-colors",
                active
                  ? "border-border-strong bg-primary text-on-primary"
                  : "border-border/30 bg-surface/10 text-inherit hover:bg-surface/15"
              )}
            >
              <SeededAvatar seed={m.seed} size={32} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold leading-tight">{m.n}</p>
                <p className={cn("truncate text-xs", active ? "text-on-primary/80" : "opacity-70")}>{m.role}</p>
              </div>
              <span
                className={cn(
                  "size-2.5 shrink-0 rounded-full",
                  m.on ? "bg-[var(--domain-stats-fill)]" : "bg-muted"
                )}
                aria-label={m.on ? "online" : "offline"}
              />
            </button>
          );
        })}
      </div>
      <button type="button" onClick={copyInvite} className="btn btn-lime w-full shrink-0 justify-center gap-1.5">
        {copied ? <Check size={16} weight="bold" /> : <Copy size={16} />}
        {copied ? `Copied #${code}` : "Invite friend"}
      </button>
    </BentoCard>
  );

  const chat = (
    <BentoCard
      title="Guild chat"
      subtitle="Study hall thread"
      className="h-full"
      bodyClassName="flex min-h-0 flex-1 flex-col justify-between gap-2"
    >
      <div className="scroll-thin min-h-0 flex-1 space-y-1.5 pr-0.5">
        {(thread?.messages ?? []).map((m, i) => (
          <p key={i} className="tile !py-1.5 text-sm">{m.content}</p>
        ))}
        {!thread && <p className="text-sm text-muted">Say hi to your guild.</p>}
      </div>
      <form
        className="flex shrink-0 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          className="input"
          aria-label="Guild message"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Message guild..."
        />
        <button className="btn btn-lime btn-icon shrink-0" aria-label="Send">
          <PaperPlaneTilt size={18} weight="fill" />
        </button>
      </form>
    </BentoCard>
  );

  const quest = (
    <BentoCard
      title="Shared quests"
      className="h-full"
      bodyClassName="flex min-h-0 flex-1 flex-col justify-between gap-1.5"
    >
      <div className="scroll-thin min-h-0 flex-1 space-y-1 pr-0.5">
        {quests.map((q) => (
          <div key={q.t} className="space-y-0.5">
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold leading-tight">
              <span className="truncate">{q.t}</span>
              <span className="num text-muted">{q.meta}</span>
            </div>
            <ProgressBar pct={Math.min(1, q.p)} variant="hatched" />
          </div>
        ))}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 rounded-xl border-[1.5px] border-border-strong bg-surface-2 px-2.5 py-1">
        <span className="text-xs font-bold">Share streak</span>
        <Switch checked={shareProgress} onCheckedChange={setShareProgress} aria-label="Share quest progress" />
      </div>
    </BentoCard>
  );

  const room = (
    <BentoCard
      title="Co-study room"
      subtitle={ambientPlaying ? `Playing ${activePreset.label}` : `${activePreset.label} ambient ready`}
      action={<Switch checked={roomOpen} onCheckedChange={setRoomOpen} aria-label="Toggle co-study room" />}
      className="h-full"
      bodyClassName="flex min-h-0 flex-1 flex-col justify-between gap-2"
    >
      <div className="flex items-center justify-between gap-2 rounded-xl border-[1.5px] border-border-strong bg-surface-2 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <Headphones size={18} weight="duotone" className="shrink-0 text-primary" />
          <span className="truncate text-xs font-bold">
            {roomOpen ? `${activePreset.label} • ${onlineCount} listening` : "Room muted"}
          </span>
        </div>
        <span className="pill bg-surface text-[11px] font-bold num">{timer.running ? fmtClock(timer.rem) : "25:00"}</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => cyclePreset(-1)}
          className="btn btn-ghost btn-sm"
          aria-label="Previous sound"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={toggleAmbient}
          className="btn btn-primary h-10 w-10 rounded-full p-0 justify-center"
          aria-label={ambientPlaying ? "Pause ambient" : "Play ambient"}
        >
          {ambientPlaying ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
        </button>
        <button
          type="button"
          onClick={() => cyclePreset(1)}
          className="btn btn-ghost btn-sm"
          aria-label="Next sound"
        >
          Next
        </button>
        <button
          type="button"
          onClick={toggleAmbient}
          className="btn btn-ghost btn-icon btn-sm"
          aria-label={ambientPlaying ? "Mute room audio" : "Unmute room audio"}
        >
          {ambientPlaying ? <SpeakerHigh size={16} /> : <SpeakerSlash size={16} />}
        </button>
      </div>
    </BentoCard>
  );

  return (
    <PageFrame title="Guilds" subtitle="Study together. Presence, chat and shared quests.">
      <Panels
        className="sm:grid-cols-2 lg:grid-cols-12 lg:grid-rows-6"
        panels={[
          { id: "g", label: "Hall", className: "sm:col-span-2 lg:col-span-8 lg:row-span-4", node: hero },
          { id: "m", label: "Members", className: "lg:col-span-4 lg:row-span-4", node: roster },
          { id: "c", label: "Chat", className: "lg:col-span-5 lg:row-span-2", node: chat },
          { id: "q", label: "Quests", className: "lg:col-span-3 lg:row-span-2", node: quest },
          { id: "r", label: "Room", className: "sm:col-span-2 lg:col-span-4 lg:row-span-2", node: room },
        ]}
      />
      <Modal open={showQr} onClose={() => setShowQr(false)} title="Guild Invite QR">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="rounded-2xl border-[1.5px] border-border-strong bg-surface p-4 shadow-xs">
            <QRCodeSVG value={`studyquest://guild/${code}`} size={168} />
          </div>
          <p className="text-xs text-muted">
            Scan or share code <span className="font-display font-bold text-fg num">#{code}</span> to join your guild.
          </p>
        </div>
      </Modal>
    </PageFrame>
  );
}
