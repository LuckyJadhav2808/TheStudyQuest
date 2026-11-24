"use client";
import { db } from "./db";
import { emit, on } from "./events";
import { levelFromXp, taskXp, pomodoroXp, XP, titleForLevel } from "./gamification";
import { buffsRepo, gameRepo, settingsRepo } from "./repos";
import { SKILLS } from "@/content/skills";
import { strobiToast } from "@/features/strobi/toast";
import { useStrobi } from "@/features/strobi/store";
import { fireConfetti } from "@/lib/confetti";
import { todayKey } from "@/lib/utils";
import { differenceInCalendarDays, parseISO } from "date-fns";

type Kind = "focus" | "dsa" | "other";
interface Grant { xp: number; coins: number; kind: Kind; focusMinutes?: number; tasks?: number; dsa?: number; drops?: Record<string, number> }

export async function getMultipliers(kind: Kind): Promise<{ xp: number; coins: number; shield: boolean }> {
  const now = Date.now();
  const [buffs, skills] = await Promise.all([db.buffs.toArray(), db.skills.toArray()]);
  const live = buffs.filter((b) => b.expiresAt > now);
  let xp = 1, coins = 1;
  if (live.some((b) => b.kind === "hyperfocus")) xp += 0.5;
  if (live.some((b) => b.kind === "midas")) coins += 1;
  for (const s of skills) {
    const m = SKILLS.find((k) => k.id === s.id)?.mod;
    if (!m) continue;
    xp += m.xp ?? 0; coins += m.coins ?? 0;
    if (kind === "focus") xp += m.focusXp ?? 0;
    if (kind === "dsa") xp += m.dsaXp ?? 0;
  }
  return { xp, coins, shield: live.some((b) => b.kind === "shield") };
}

export async function grant(g: Grant): Promise<{ xp: number; coins: number }> {
  const m = await getMultipliers(g.kind);
  const xp = Math.round(g.xp * m.xp), coins = Math.round(g.coins * m.coins);
  const today = todayKey();
  let streakNow = 0, extended = false, prevLevel = 0, newLevel = 0;
  await gameRepo.mutate((cur) => {
    prevLevel = cur.level;
    let streak = cur.streak;
    if (cur.lastActive !== today) {
      const gap = cur.lastActive ? differenceInCalendarDays(parseISO(today), parseISO(cur.lastActive)) : 99;
      streak = gap === 1 || (gap === 2 && m.shield) ? cur.streak + 1 : 1;
      extended = streak > 1;
    }
    streakNow = streak;
    const totalXp = cur.xp + xp;
    newLevel = levelFromXp(totalXp);
    const ingredients = { ...cur.ingredients };
    for (const [k, v] of Object.entries(g.drops ?? {})) ingredients[k] = (ingredients[k] ?? 0) + v;
    return {
      ...cur, xp: totalXp, level: newLevel, coins: cur.coins + coins, skillPoints: cur.skillPoints + Math.max(0, newLevel - prevLevel),
      streak, bestStreak: Math.max(cur.bestStreak, streak), lastActive: today, ingredients,
      focusMinutes: cur.focusMinutes + (g.focusMinutes ?? 0), tasksDone: cur.tasksDone + (g.tasks ?? 0), dsaSolved: cur.dsaSolved + (g.dsa ?? 0),
    };
  });
  if (newLevel > prevLevel) {
    await settingsRepo.patch({ title: titleForLevel(newLevel) });
    emit("level.up", { level: newLevel });
  }
  if (extended) emit("streak.extended", { days: streakNow });
  return { xp, coins };
}

async function codeRunAllowed(): Promise<boolean> {
  const today = todayKey();
  let ok = false;
  await gameRepo.mutate((g) => {
    const cur = g.codeRunsToday.date === today ? g.codeRunsToday.n : 0;
    ok = cur * XP.codeRun < XP.codeRunDailyCap;
    return { ...g, codeRunsToday: { date: today, n: ok ? cur + 1 : cur } };
  });
  return ok;
}

let started = false;
/** Subscribes the gamification engine to the event bus. Idempotent. */
export function startEngine(): void {
  if (started) return;
  started = true;
  const say = (key: string, vars: Record<string, string | number>, big = false) => { strobiToast(key, vars); if (big) fireConfetti(true); };
  on("task.completed", async (p) => { const r = await grant({ xp: taskXp(p.priority), coins: p.priority === "urgent" ? 10 : 5, kind: "other", tasks: 1, drops: Math.random() < 0.2 ? { elixir: 1 } : undefined }); say("task.completed", { xp: r.xp }); fireConfetti(); });
  on("habit.checked", async (p) => { const r = await grant({ xp: XP.habit, coins: 3, kind: "other" }); say("habit.checked", { xp: r.xp, n: p.streak }); });
  on("pomodoro.done", async (p) => { const r = await grant({ xp: pomodoroXp(p.minutes), coins: Math.round((p.minutes / 25) * 8), kind: "focus", focusMinutes: p.minutes, drops: Math.random() < 0.4 ? { stardust: 1 } : undefined }); say("pomodoro.done", { xp: r.xp, n: p.minutes }, true); });
  on("note.created", async () => { const r = await grant({ xp: XP.note, coins: 2, kind: "other" }); say("note.created", { xp: r.xp }); });
  on("code.ran", async () => { if (await codeRunAllowed()) { const r = await grant({ xp: XP.codeRun, coins: 0, kind: "other" }); say("code.ran", { xp: r.xp }); } });
  on("dsa.solved", async (p) => { const r = await grant({ xp: XP.dsa[p.difficulty], coins: { easy: 10, medium: 20, hard: 30 }[p.difficulty], kind: "dsa", dsa: 1, drops: p.difficulty === "hard" ? { crystal: 1 } : undefined }); say("dsa.solved", { xp: r.xp }, true); });
  on("quiz.passed", async (p) => { const r = await grant({ xp: p.xp, coins: 5, kind: "other" }); say("quiz.passed", { xp: r.xp, label: p.label }); });
  on("reward.manual", async (p) => { const r = await grant({ xp: p.xp, coins: p.coins, kind: "other" }); say("reward.manual", { xp: r.xp, label: p.label }); });
  on("arcade.win", async (p) => { await gameRepo.mutate((g) => ({ ...g, coins: g.coins + p.coins })); say("arcade.win", { coins: p.coins }); });
  on("chest.opened", async (p) => { await gameRepo.mutate((g) => ({ ...g, coins: g.coins + p.coins, ingredients: { ...g.ingredients, goldleaf: (g.ingredients.goldleaf ?? 0) + 1, stardust: (g.ingredients.stardust ?? 0) + 1 } })); say("chest.opened", { coins: p.coins }, true); });
  on("level.up", (p) => say("level.up", { n: p.level }, true));
  on("streak.extended", (p) => say("streak.extended", { n: p.days }));
  on("streak.at_risk", () => say("streak.at_risk", {}));
  on("pet.fed", (p) => say("pet.fed", { name: p.petName }));
  on("buff.expired", (p) => say("buff.expired", { what: p.kind }));
  on("tab.left_during_focus", () => { say("tab.left_during_focus", {}); useStrobi.getState().setMood("alert", 5000); });
  on("idle.long", () => { say("idle.long", {}); useStrobi.getState().setMood("sleepy"); });
  on("offline.entered", () => say("offline.entered", {}));
  on("online.restored", () => say("online.restored", {}));
  on("saved", (p) => say("saved", { what: p.what }));
  window.setInterval(async () => {
    const now = Date.now();
    for (const b of await buffsRepo.active()) if (b.expiresAt <= now) { await buffsRepo.remove(b.id); emit("buff.expired", { kind: b.kind }); }
  }, 30000);
}
