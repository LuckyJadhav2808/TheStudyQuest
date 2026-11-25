"use client";
import { toast } from "sonner";
import { TOAST_MESSAGES } from "@/content/toastMessages";
import { playSfx, type SfxKind } from "@/lib/audio";
import { StrobiFace } from "./StrobiFace";
import { useStrobi, type Mood } from "./store";

export type ToastVariant = "xp" | "levelup" | "coin" | "streak" | "warning" | "tip" | "error" | "undo";
interface Meta { variant: ToastVariant; mood: Mood }
const META: Record<string, Meta> = {
  "task.completed": { variant: "xp", mood: "happy" }, "habit.checked": { variant: "xp", mood: "happy" },
  "pomodoro.done": { variant: "xp", mood: "cheer" }, "streak.extended": { variant: "streak", mood: "cheer" },
  "streak.at_risk": { variant: "warning", mood: "alert" }, "level.up": { variant: "levelup", mood: "celebrate" },
  "note.created": { variant: "xp", mood: "happy" }, "code.ran": { variant: "tip", mood: "thinking" },
  "dsa.solved": { variant: "xp", mood: "cheer" }, "pet.fed": { variant: "tip", mood: "happy" },
  "buff.expired": { variant: "warning", mood: "idle" }, "tab.left_during_focus": { variant: "warning", mood: "alert" },
  "idle.long": { variant: "tip", mood: "sleepy" }, "offline.entered": { variant: "warning", mood: "thinking" },
  "online.restored": { variant: "tip", mood: "happy" }, saved: { variant: "tip", mood: "happy" },
  "quiz.passed": { variant: "xp", mood: "cheer" }, "arcade.win": { variant: "coin", mood: "celebrate" },
  "chest.opened": { variant: "coin", mood: "celebrate" }, "reward.manual": { variant: "xp", mood: "happy" },
  error: { variant: "error", mood: "alert" }, undo: { variant: "undo", mood: "thinking" }, tip: { variant: "tip", mood: "idle" }, coin: { variant: "coin", mood: "happy" },
};
const SFX: Record<ToastVariant, SfxKind> = { xp: "xp", levelup: "level", coin: "coin", streak: "streak", warning: "warn", tip: "tip", error: "error", undo: "tip" };
const ACCENT: Record<ToastVariant, string> = { xp: "var(--primary)", levelup: "var(--domain-quests-fill)", coin: "var(--warning)", streak: "var(--domain-quests-fill)", warning: "var(--warning)", tip: "var(--domain-stats-fill)", error: "var(--danger)", undo: "var(--domain-notes-fill)" };

const MAX_ACTIVE_TOASTS = 2;
const SFX_COOLDOWN_MS = 650;
const lastIdx = new Map<string, number>();
const recent = new Map<string, number>();
const activeQueue: Array<{ id: string | number; variant: ToastVariant; at: number }> = [];
let lastSfxAt = 0;
type Vars = Record<string, string | number>;

function render(key: string, vars: Vars): string {
  const pool = TOAST_MESSAGES[key] ?? TOAST_MESSAGES.tip;
  let i = Math.floor(Math.random() * pool.length);
  if (pool.length > 1 && i === lastIdx.get(key)) i = (i + 1) % pool.length;
  lastIdx.set(key, i);
  return pool[i].replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
}
export interface ToastOpts { action?: { label: string; onClick: () => void }; duration?: number; variant?: ToastVariant; silent?: boolean }

function View({ id, message, variant, mood, action, duration, timed }: { id: string | number; message: string; variant: ToastVariant; mood: Mood; action?: ToastOpts["action"]; duration: number; timed: boolean }) {
  return (
    <div
      role="status"
      className="pop-in relative flex w-[min(92vw,360px)] items-center gap-3 rounded-full border-[1.5px] border-border-strong bg-surface py-2 pl-2 pr-4 text-fg shadow-[0_10px_30px_-12px_rgba(0,0,0,.35)]"
      style={{ transformOrigin: "left center" }}
    >
      {/* Speech-bubble tail pointing back to Strobi */}
      <span aria-hidden className="absolute -left-1.5 top-1/2 size-3 -translate-y-1/2 rotate-45 border-b-[1.5px] border-l-[1.5px] border-border-strong bg-surface" />
      <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full" style={{ background: ACCENT[variant] }}>
        <StrobiFace mood={mood} size={32} />
      </span>
      <p className="relative z-10 min-w-0 flex-1 text-[13px] font-semibold leading-snug">{message}</p>
      {action && (
        <button className="btn btn-ink btn-sm relative z-10 shrink-0" style={{ minHeight: 32 }} onClick={() => { action.onClick(); toast.dismiss(id); }}>{action.label}</button>
      )}
      {timed && <span className="absolute bottom-0 left-4 right-4 h-1 rounded-full bg-primary" style={{ animation: `toast-bar ${duration}ms linear forwards` }} />}
      <style>{`@keyframes toast-bar{from{transform:scaleX(1)}to{transform:scaleX(0)}}`}</style>
    </div>
  );
}

function showManagedToast(
  message: string,
  variant: ToastVariant,
  mood: Mood,
  opts: ToastOpts,
  duration: number,
  timed: boolean
) {
  const now = Date.now();
  // Prune expired entries from activeQueue
  for (let i = activeQueue.length - 1; i >= 0; i--) {
    if (now - activeQueue[i].at > duration) activeQueue.splice(i, 1);
  }

  // Throttle overlapping sound effects during multi-toast bursts
  if (!opts.silent && now - lastSfxAt >= SFX_COOLDOWN_MS) {
    lastSfxAt = now;
    playSfx(SFX[variant]);
  }

  // Coalesce rapid same-variant toasts without action (e.g. multiple XP/tip bursts)
  const sameIdx = !opts.action ? activeQueue.findIndex((t) => t.variant === variant && now - t.at < 900) : -1;
  if (sameIdx !== -1) {
    const targetId = activeQueue[sameIdx].id;
    activeQueue[sameIdx].at = now;
    toast.custom(
      (id) => <View id={id} message={message} variant={variant} mood={mood} action={opts.action} duration={duration} timed={timed} />,
      { id: targetId, duration }
    );
    return;
  }

  // Evict oldest non-undo/non-error toast if at capacity so Sonner never builds a backlog
  while (activeQueue.length >= MAX_ACTIVE_TOASTS) {
    const evictIdx = activeQueue.findIndex((t) => t.variant !== "undo" && t.variant !== "error");
    const removed = activeQueue.splice(evictIdx === -1 ? 0 : evictIdx, 1)[0];
    if (removed) toast.dismiss(removed.id);
  }

  const id = toast.custom(
    (tid) => <View id={tid} message={message} variant={variant} mood={mood} action={opts.action} duration={duration} timed={timed} />,
    { duration }
  );
  activeQueue.push({ id, variant, at: now });
}

export function strobiToast(event: string, vars: Vars = {}, opts: ToastOpts = {}): void {
  const dedupeKey = event + JSON.stringify(vars);
  const now = Date.now();
  if (now - (recent.get(dedupeKey) ?? 0) < 3000) return;
  if (recent.size > 120) recent.clear();
  recent.set(dedupeKey, now);
  const meta = META[event] ?? META.tip;
  const variant = opts.variant ?? meta.variant;
  const duration = opts.duration ?? (variant === "undo" ? 10000 : 4200);
  const message = render(event, vars);
  useStrobi.getState().setMood(meta.mood);
  showManagedToast(message, variant, meta.mood, opts, duration, variant !== "tip" || Boolean(opts.action));
}

export function strobiSay(message: string, variant: ToastVariant = "tip", opts: ToastOpts = {}): void {
  const key = "say" + message;
  const now = Date.now();
  if (now - (recent.get(key) ?? 0) < 3000) return;
  if (recent.size > 120) recent.clear();
  recent.set(key, now);
  const mood: Mood = variant === "error" ? "alert" : variant === "xp" || variant === "levelup" ? "cheer" : "happy";
  useStrobi.getState().setMood(mood);
  const duration = opts.duration ?? 4200;
  showManagedToast(message, variant, mood, opts, duration, true);
}
