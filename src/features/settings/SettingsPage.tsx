"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BentoCard } from "@/components/shell/BentoCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageFrame, ProgressBar, Segmented } from "@/components/ui/misc";
import { Field, Select } from "@/components/ui/fields";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useUI } from "@/components/shell/ui-store";
import { DEFAULT_FLAGS, useFlags, type FlagName } from "@/core/flags";
import { updateSettings, useGame, useSettings } from "@/core/settings";
import { levelProgress } from "@/core/gamification";
import type { ThemeName } from "@/core/types";
import { strobiSay } from "@/features/strobi/toast";
import { playSfx } from "@/lib/audio";
import { exportBackup, importBackup, resetAll } from "./dataTools";

const THEMES: { id: ThemeName; label: string; bg: string }[] = [
  { id: "paper", label: "Paper", bg: "#F5F5F2" },
  { id: "ink", label: "Ink", bg: "#0B0B0C" },
  { id: "lavender", label: "Lavender", bg: "#E8E4FF" },
  { id: "peach", label: "Peach", bg: "#FFE2D2" },
];
const hue = (s: string) => [...s].reduce((a, c) => a + c.charCodeAt(0) * 7, 0) % 360;

type TabKey = "profile" | "look" | "ai" | "data" | "features";

export function SettingsPage() {
  const router = useRouter();
  const s = useSettings();
  const g = useGame();
  const lp = levelProgress(g.xp);
  const flags = useFlags();
  const setUI = useUI((x) => x.set);
  const [tab, setTab] = useState<TabKey>("profile");
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null);
  const [confirm, setConfirm] = useState("");
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void navigator.storage?.estimate?.().then((e) => setUsage({ used: e.usage ?? 0, quota: e.quota ?? 1 }));
  }, []);

  const notify = async (on: boolean) => {
    if (!on) return void updateSettings({ notifications: false });
    if (!("Notification" in window)) return strobiSay("Notifications are not supported here.", "error");
    const p = await Notification.requestPermission();
    if (p === "granted") void updateSettings({ notifications: true });
    else strobiSay("No problem. Notifications stay off.", "tip");
  };

  return (
    <PageFrame title="Settings" subtitle="Profile, look, sound, AI and data controls.">
      <div className="h-full min-h-0 w-full">
        <BentoCard
          action={
            <Segmented<TabKey>
              value={tab}
              onChange={setTab}
              options={[
                { value: "profile", label: "Profile" },
                { value: "look", label: "Look & Sound" },
                { value: "ai", label: "AI" },
                { value: "data", label: "Data" },
                { value: "features", label: "Features" },
              ]}
            />
          }
          className="h-full"
        >
          <ScrollArea className="flex-1 min-h-0 pr-2">
            {tab === "profile" && (
              <div className="grid gap-5 py-1 lg:grid-cols-12 items-stretch">
                {/* Left Column: Tall Profile Preview + Lifetime Stats */}
                <div className="tile lg:col-span-4 flex flex-col justify-between gap-4 p-5 border border-line/40 bg-lavender/25">
                  <div className="flex flex-col items-center text-center gap-2.5">
                    <span
                      className="font-display grid size-20 place-items-center rounded-full border-[2px] border-ink text-3xl text-ink shadow-sm shrink-0"
                      style={{ background: `hsl(${hue(s.avatarSeed)} 80% 75%)` }}
                      aria-hidden
                    >
                      {s.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <p className="font-display text-xl font-extrabold">{s.name}</p>
                      <span className="inline-block mt-1 rounded-full border border-ink/40 bg-lime px-3 py-0.5 text-[11px] font-bold text-ink">
                        {s.title}
                      </span>
                    </div>
                    <div className="w-full pt-1 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>Lv {lp.level}</span>
                        <span className="num text-muted">{lp.into} / {lp.need} XP</span>
                      </div>
                      <ProgressBar pct={lp.need > 0 ? lp.into / lp.need : 0} color="var(--color-violet)" />
                    </div>
                  </div>

                  {/* Lifetime Stats */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-line/15">
                    <div className="rounded-xl bg-surface/80 p-2.5 text-center">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-muted">Focus</span>
                      <span className="font-display num text-lg font-extrabold">{(g.focusMinutes / 60).toFixed(1)}h</span>
                    </div>
                    <div className="rounded-xl bg-surface/80 p-2.5 text-center">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-muted">Quests</span>
                      <span className="font-display num text-lg font-extrabold">{g.tasksDone}</span>
                    </div>
                    <div className="rounded-xl bg-surface/80 p-2.5 text-center">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-muted">Streak</span>
                      <span className="font-display num text-lg font-extrabold">{g.streak}d</span>
                    </div>
                    <div className="rounded-xl bg-surface/80 p-2.5 text-center">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-muted">Coins</span>
                      <span className="font-display num text-lg font-extrabold">{g.coins}</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Form Grid + Achievements + Danger Strip */}
                <div className="lg:col-span-8 flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Display name">
                        <input
                          className="input"
                          defaultValue={s.name}
                          onBlur={(e) => void updateSettings({ name: e.target.value.trim() || "Scholar" })}
                        />
                      </Field>
                      <Field label="Avatar seed">
                        <input
                          className="input"
                          defaultValue={s.avatarSeed}
                          onBlur={(e) => void updateSettings({ avatarSeed: e.target.value })}
                        />
                      </Field>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Main goal">
                        <input
                          className="input"
                          defaultValue={s.goal}
                          onBlur={(e) => void updateSettings({ goal: e.target.value })}
                        />
                      </Field>
                      <Field label="Daily focus goal (minutes)">
                        <input
                          className="input"
                          type="number"
                          min={10}
                          defaultValue={s.focusGoalMin}
                          onBlur={(e) => void updateSettings({ focusGoalMin: Math.max(10, Number(e.target.value) || 120) })}
                        />
                      </Field>
                    </div>

                    <label className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-soft/40 p-3 text-xs sm:text-sm font-bold cursor-pointer">
                      <span>Notify me when a break ends or a streak is at risk</span>
                      <Switch checked={s.notifications} onCheckedChange={(v) => void notify(v)} />
                    </label>
                  </div>

                  {/* Achievements / Titles grid */}
                  <div className="rounded-2xl border border-line/20 bg-soft/30 p-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted mb-2">Titles & Milestones</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { title: "Rookie Scholar", unlocked: true },
                        { title: "Deep Diver", unlocked: g.focusMinutes >= 60 },
                        { title: "Quest Hunter", unlocked: g.tasksDone >= 5 },
                        { title: "7-Day Flame", unlocked: g.streak >= 7 },
                      ].map((ach) => (
                        <div
                          key={ach.title}
                          className={`rounded-xl border px-2.5 py-2 text-center text-xs font-bold ${
                            ach.unlocked
                              ? "border-ink bg-lime/70 text-ink"
                              : "border-dashed border-line/50 bg-surface/50 text-muted opacity-50"
                          }`}
                        >
                          {ach.title}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action & Danger-zone strip */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-line/15">
                    <div className="flex flex-wrap gap-2">
                      <Link className="btn btn-sm text-xs" href="/login">Character creation</Link>
                      <Link className="btn btn-sm text-xs" href="/privacy">Privacy</Link>
                      <button className="btn btn-sm text-xs" onClick={() => setUI({ changelog: true })}>v1.0.0</button>
                      <button className="btn btn-sm text-xs" onClick={() => setUI({ shortcuts: true })}>Shortcuts</button>
                    </div>
                    <button
                      className="btn btn-sm text-xs border-red-500/60 text-red-600 hover:bg-red-500/10"
                      onClick={() => setTab("data")}
                    >
                      Data & Reset
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === "look" && (
              <div className="flex max-w-xl flex-col gap-4 py-2">
                <div>
                  <p className="text-xs font-bold text-muted mb-2 uppercase tracking-wide">Theme palette</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Theme">
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        role="radio"
                        aria-checked={s.theme === t.id}
                        onClick={() => void updateSettings({ theme: t.id })}
                        className={`flex min-h-11 items-center gap-2.5 rounded-full border-[1.5px] px-3.5 text-xs font-bold transition ${
                          s.theme === t.id ? "border-ink bg-lime text-ink shadow-xs" : "border-line/60 bg-surface hover:border-ink"
                        }`}
                      >
                        <span className="size-5 rounded-full border border-ink/40 shrink-0" style={{ background: t.bg }} />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-2xl border border-line bg-soft/30 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">Audio levels</p>
                  <div className="flex items-center gap-4">
                    <span className="w-16 shrink-0 text-xs font-bold">Master</span>
                    <Slider
                      min={0}
                      max={1}
                      step={0.05}
                      value={s.masterVolume}
                      onChange={(e) => void updateSettings({ masterVolume: +e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-16 shrink-0 text-xs font-bold">Effects</span>
                    <Slider
                      min={0}
                      max={1}
                      step={0.05}
                      value={s.sfxVolume}
                      onChange={(e) => void updateSettings({ sfxVolume: +e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-16 shrink-0 text-xs font-bold">Music</span>
                    <Slider
                      min={0}
                      max={1}
                      step={0.05}
                      value={s.musicVolume}
                      onChange={(e) => void updateSettings({ musicVolume: +e.target.value })}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-line/40">
                    <label className="flex items-center gap-2.5 text-xs font-bold cursor-pointer">
                      <Switch checked={s.muted} onCheckedChange={(v) => void updateSettings({ muted: v })} />
                      Mute all audio
                    </label>
                    <button className="btn btn-sm text-xs py-1 px-3" onClick={() => playSfx("level")}>
                      Test sound
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === "ai" && (
              <div className="flex max-w-xl flex-col gap-4 py-2">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-fg">AI provider</span>
                  <Select
                    value={s.aiProvider}
                    onChange={(v) => void updateSettings({ aiProvider: v as typeof s.aiProvider })}
                    options={[
                      { value: "openrouter", label: "OpenRouter" },
                      { value: "openai", label: "OpenAI" },
                      { value: "google", label: "Google Gemini" },
                    ]}
                  />
                </div>

                <Field label="Model">
                  <input
                    className="input"
                    defaultValue={s.aiModel}
                    onBlur={(e) => void updateSettings({ aiModel: e.target.value.trim() })}
                  />
                </Field>

                <Field label="API key (stored locally on this device, never logged)">
                  <input
                    className="input"
                    type="password"
                    autoComplete="off"
                    defaultValue={s.aiKey}
                    onBlur={(e) => void updateSettings({ aiKey: e.target.value.trim() })}
                    placeholder="sk-..."
                  />
                </Field>
              </div>
            )}

            {tab === "data" && (
              <div className="flex max-w-xl flex-col gap-4 py-2">
                <div className="tile p-4">
                  {usage ? (
                    <>
                      <div className="mb-2 flex justify-between text-xs sm:text-sm font-bold">
                        <span>Storage used</span>
                        <span className="num">
                          {(usage.used / 1048576).toFixed(1)} MB of {(usage.quota / 1073741824).toFixed(1)} GB
                        </span>
                      </div>
                      <ProgressBar pct={Math.max(0.01, usage.used / usage.quota)} />
                    </>
                  ) : (
                    <p className="text-xs text-muted">Storage estimate unavailable in this context.</p>
                  )}
                  <button
                    className="btn btn-sm text-xs mt-3"
                    onClick={async () =>
                      strobiSay(
                        (await navigator.storage?.persist?.())
                          ? "Storage will be kept."
                          : "The browser declined to persist storage.",
                        "tip"
                      )
                    }
                  >
                    Request persistent storage
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-ink text-xs" onClick={() => void exportBackup()}>
                    Export backup
                  </button>
                  <button className="btn text-xs" onClick={() => file.current?.click()}>
                    Restore backup
                  </button>
                  <input
                    ref={file}
                    hidden
                    type="file"
                    accept=".json"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      try {
                        await importBackup(await f.text());
                        strobiSay("Backup restored.", "tip");
                      } catch (er) {
                        strobiSay(er instanceof Error ? er.message : "Restore failed", "error");
                      }
                      e.target.value = "";
                    }}
                  />
                </div>

                <div className="tile border-[1.5px] border-red-300 p-4 mt-2">
                  <p className="text-sm font-bold text-red-600">Reset all data</p>
                  <p className="text-xs text-muted mt-0.5">
                    Type RESET to wipe every database table on this device. This cannot be undone.
                  </p>
                  <div className="mt-2.5 flex gap-2">
                    <input
                      className="input !min-h-9"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      aria-label="Type RESET to confirm"
                      placeholder="Type RESET"
                    />
                    <button
                      className="btn border-red-500 text-red-600 text-xs px-4"
                      disabled={confirm !== "RESET"}
                      onClick={async () => {
                        await resetAll();
                        router.push("/");
                      }}
                    >
                      Wipe
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === "features" && (
              <div className="flex max-w-xl flex-col gap-3 py-2">
                <p className="text-xs font-bold text-muted uppercase tracking-wide">Feature flags</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(Object.keys(DEFAULT_FLAGS) as FlagName[]).map((k) => (
                    <label
                      key={k}
                      className="tile flex min-h-11 items-center gap-3 p-3 text-xs sm:text-sm font-semibold cursor-pointer hover:bg-soft"
                    >
                      <Checkbox
                        checked={flags[k]}
                        onCheckedChange={(checked) =>
                          void updateSettings({ flags: { ...s.flags, [k]: checked } })
                        }
                      />
                      <span>{k}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>
        </BentoCard>
      </div>
    </PageFrame>
  );
}
