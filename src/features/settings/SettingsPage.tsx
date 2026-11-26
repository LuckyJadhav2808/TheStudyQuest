"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { useEffect, useRef, useState } from "react";
import { Check, Compass, DiceFive, SignOut } from "@phosphor-icons/react";
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
import type { SurfaceStyle, ThemeName } from "@/core/types";
import { strobiSay } from "@/features/strobi/toast";
import { playSfx } from "@/lib/audio";
import { switchSurfaceWithRipple, switchThemeWithRipple } from "@/lib/themeRipple";
import { fetchCloudSession, syncWithCloud, type CloudUser } from "@/lib/cloudSync";
import { isLocalAiCached, preloadLocalAi } from "@/lib/localAi";
import { startDesktopTour } from "@/lib/tour";
import { SeededAvatar } from "@/components/illustrations/SeededAvatar";
import { Illustration } from "@/components/illustrations/Illustration";
import { exportBackup, importBackup, resetAll } from "./dataTools";

const THEMES: { id: ThemeName; label: string; bg: string }[] = [
  { id: "pastel", label: "Light · Pastel", bg: "#F4E7FB" },
  { id: "obsidian", label: "Dark · Obsidian", bg: "#E85002" },
];
const hue = (s: string) => [...s].reduce((a, c) => a + c.charCodeAt(0) * 7, 0) % 360;

type TabKey = "profile" | "look" | "ai" | "data" | "features";

const VALID_TABS: TabKey[] = ["profile", "look", "ai", "data", "features"];

export function SettingsPage() {
  const router = useRouter();
  const s = useSettings();
  const g = useGame();
  const lp = levelProgress(g.xp);
  const flags = useFlags();
  const setUI = useUI((x) => x.set);
  const [rawTab, setRawTab] = useQueryState("tab", { defaultValue: "profile" });
  const tab: TabKey = VALID_TABS.includes(rawTab as TabKey) ? (rawTab as TabKey) : "profile";
  const setTab = (next: TabKey) => void setRawTab(next);
  const [savedFlash, setSavedFlash] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null);
  const [confirm, setConfirm] = useState("");
  const [cloudUser, setCloudUser] = useState<CloudUser | null>(null);
  const [cloudConfigured, setCloudConfigured] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [modelCached, setModelCached] = useState<boolean | null>(null);
  const [dlBusy, setDlBusy] = useState(false);
  const [dlPct, setDlPct] = useState(0);
  const [dlStatus, setDlStatus] = useState("");
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void navigator.storage?.estimate?.().then((e) => setUsage({ used: e.usage ?? 0, quota: e.quota ?? 1 }));
    void isLocalAiCached().then(setModelCached);
    void fetchCloudSession().then((r) => {
      setCloudConfigured(r.configured);
      setCloudUser(r.user);
    });
  }, []);

  const persist = (patch: Partial<typeof s>) => {
    void updateSettings(patch);
    setSavedFlash(true);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSavedFlash(false), 1400);
  };

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
                    <SeededAvatar seed={s.avatarSeed || "strobi"} size={80} className="shadow-sm" />
                    <div>
                      <p className="font-display text-xl font-extrabold">{s.name}</p>
                      <span className="inline-flex items-center gap-1.5 mt-1 rounded-full border border-border-strong/40 bg-primary px-3 py-0.5 text-[11px] font-bold text-on-primary">
                        <Illustration name="rank-badge" tone="notes" rank={lp.level} className="size-4" />
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
                  {/* Account Status Pill + Saved Indicator */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line/40 bg-surface-2/60 px-3.5 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`size-2 rounded-full shrink-0 ${cloudUser ? "bg-[var(--success)]" : "bg-muted"}`} />
                      <span className="truncate text-xs font-bold text-fg">
                        {cloudUser ? `Signed in: ${cloudUser.email}` : "Local Guest Profile"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {savedFlash && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success-tint)] px-2.5 py-0.5 text-[11px] font-extrabold text-[var(--success-text)]">
                          <Check size={11} weight="bold" /> Saved
                        </span>
                      )}
                      {cloudUser ? (
                        <button
                          type="button"
                          onClick={async () => {
                            await fetch("/api/auth/logout", { method: "POST" });
                            setCloudUser(null);
                            strobiSay("Signed out of Cloud Sync.", "tip");
                          }}
                          className="chip !min-h-6 !px-2.5 text-[11px] font-bold hover:bg-surface inline-flex items-center gap-1"
                        >
                          <SignOut size={12} /> Sign out
                        </button>
                      ) : (
                        <Link href="/login" className="chip !min-h-6 !px-2.5 text-[11px] font-bold bg-primary text-on-primary">
                          Sign in / Sync
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Display name">
                        <input
                          className="input"
                          value={s.name}
                          onChange={(e) => persist({ name: e.target.value })}
                          onBlur={(e) => {
                            if (!e.target.value.trim()) persist({ name: "Scholar" });
                          }}
                        />
                      </Field>
                      <Field label="Avatar seed">
                        <div className="flex items-center gap-1.5">
                          <input
                            className="input flex-1"
                            value={s.avatarSeed}
                            onChange={(e) => persist({ avatarSeed: e.target.value })}
                          />
                          <button
                            type="button"
                            aria-label="Randomize avatar"
                            title="Randomize avatar"
                            onClick={() => persist({ avatarSeed: `scholar-${Math.random().toString(36).slice(2, 7)}` })}
                            className="btn btn-icon shrink-0 !min-h-10 !w-10"
                          >
                            <DiceFive size={18} weight="duotone" />
                          </button>
                        </div>
                      </Field>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Main goal">
                        <input
                          className="input"
                          value={s.goal}
                          onChange={(e) => persist({ goal: e.target.value })}
                        />
                      </Field>
                      <Field label="Daily focus goal (minutes)">
                        <input
                          className="input"
                          type="number"
                          min={10}
                          value={s.focusGoalMin}
                          onChange={(e) => persist({ focusGoalMin: Math.max(10, Number(e.target.value) || 120) })}
                        />
                      </Field>
                    </div>

                    <label className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-soft/40 p-3 text-xs sm:text-sm font-bold cursor-pointer">
                      <span>Notify me when a break ends or a streak is at risk</span>
                      <Switch checked={s.notifications} onCheckedChange={(v) => void notify(v)} />
                    </label>
                  </div>

                  {/* Equippable Titles & Milestones grid */}
                  <div className="rounded-2xl border border-line/40 bg-soft/30 p-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted mb-2">
                        Titles &amp; Milestones (click unlocked to equip)
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { title: "Rookie Scholar", unlocked: true },
                          { title: "Deep Diver", unlocked: g.focusMinutes >= 60 },
                          { title: "Quest Hunter", unlocked: g.tasksDone >= 5 },
                          { title: "7-Day Flame", unlocked: g.streak >= 7 },
                        ].map((ach) => {
                          const equipped = s.title === ach.title;
                          return (
                            <button
                              key={ach.title}
                              type="button"
                              disabled={!ach.unlocked}
                              onClick={() => {
                                persist({ title: ach.title });
                                strobiSay(`Equipped title: ${ach.title}`, "tip");
                              }}
                              className={`rounded-xl border px-2.5 py-2 text-center text-xs font-bold transition ${
                                equipped
                                  ? "border-border-strong bg-surface-inverse text-on-inverse shadow-xs"
                                  : ach.unlocked
                                  ? "border-border-strong/50 bg-primary/70 text-on-primary hover:bg-primary cursor-pointer"
                                  : "border-dashed border-line bg-surface/50 text-muted opacity-50 cursor-not-allowed"
                              }`}
                            >
                              <span className="block truncate">{ach.title}</span>
                              {equipped && <span className="block text-[9px] opacity-80 mt-0.5">Equipped</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <Illustration name="character-sheet" tone="notes" className="hidden xl:block w-24 h-16 opacity-85" />
                  </div>

                  {/* Action & Danger-zone strip */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-line/15">
                    <div className="flex flex-wrap gap-2">
                      <Link className="btn btn-sm text-xs" href="/login">Character creation</Link>
                      <button
                        type="button"
                        className="btn btn-sm text-xs gap-1"
                        onClick={() => startDesktopTour(true)}
                      >
                        <Compass size={13} weight="duotone" /> Replay tour
                      </button>
                      <Link className="btn btn-sm text-xs" href="/privacy">Privacy</Link>
                      <button className="btn btn-sm text-xs" onClick={() => setUI({ changelog: true })}>v1.0.0</button>
                      <button className="btn btn-sm text-xs" onClick={() => setUI({ shortcuts: true })}>Shortcuts</button>
                    </div>
                    <button
                      className="btn btn-sm text-xs border-[var(--danger)] text-[var(--danger-text)] bg-[var(--danger-tint)] hover:opacity-90"
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
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-muted mb-2 uppercase tracking-wide">Theme palette</p>
                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Theme">
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        role="radio"
                        aria-checked={s.theme === t.id}
                        onClick={(e) => switchThemeWithRipple(t.id, e)}
                        className={`flex min-h-11 items-center gap-2.5 rounded-full border-[1.5px] px-3.5 text-xs font-bold transition cursor-pointer ${
                          s.theme === t.id ? "border-border-strong bg-primary text-on-primary shadow-xs" : "border-line bg-surface text-fg hover:border-border-strong"
                        }`}
                      >
                        <span className="size-5 rounded-full border border-ink/40 shrink-0" style={{ background: t.bg }} />
                        {t.label}
                      </button>
                    ))}
                  </div>
                  </div>
                  <Illustration name="palette" tone="notes" className="hidden sm:block w-16 h-14 opacity-90" />
                </div>

                <div>
                  <p className="text-xs font-bold text-muted mb-2 uppercase tracking-wide">Surface style</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Segmented<SurfaceStyle>
                      ariaLabel="Surface style"
                      value={s.surfaceStyle ?? "classic"}
                      onChange={(next) => switchSurfaceWithRipple(next)}
                      options={[
                        { value: "classic", label: "Classic" },
                        { value: "neumorphic", label: "Neumorphic" },
                      ]}
                    />
                    <span className="text-xs text-muted">
                      {(s.surfaceStyle ?? "classic") === "neumorphic"
                        ? "Soft extruded 3D cards & recessed inputs."
                        : "Crisp borders & tactile contrast."}
                    </span>
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
                <div className="flex items-center gap-3 rounded-2xl border border-line/40 bg-[var(--domain-notes-tint)]/50 p-4">
                  <Illustration name="sparkles-ai" tone="notes" className="w-12 h-10" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-extrabold">On-Device Transformer AI</p>
                      <span
                        className={`pill text-[11px] font-extrabold ${
                          modelCached
                            ? "bg-[var(--success-tint)] text-[var(--success-text)]"
                            : "bg-[var(--warning-tint)] text-[var(--warning-text)]"
                        }`}
                      >
                        {modelCached ? "Cached & Ready Offline" : "Not Downloaded Yet"}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-1">
                      Powered locally by Transformers.js (<code className="font-mono">LaMini-Flan-T5-77M</code>) and Compromise NLP inside a Web Worker. No API keys are needed and your notes never leave this device.
                    </p>
                  </div>
                </div>

                <div className="tile flex flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-extrabold">Offline Model Cache</p>
                      <p className="text-[11px] text-muted">
                        Pre-download weights to <code className="font-mono">transformers-cache</code> for instant offline summaries.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={dlBusy}
                      onClick={async () => {
                        setDlBusy(true);
                        setDlPct(1);
                        setDlStatus("Starting worker…");
                        try {
                          await preloadLocalAi((pct, status) => {
                            setDlPct(pct);
                            if (status) setDlStatus(status);
                          });
                          setDlPct(100);
                          setDlStatus("Model ready");
                          setModelCached(true);
                          strobiSay("Local AI model cached and ready offline!", "tip");
                        } catch (err) {
                          setDlStatus("");
                          strobiSay(err instanceof Error ? err.message : "Could not download local AI model.", "error");
                        }
                        setDlBusy(false);
                      }}
                      className="btn btn-lime btn-sm"
                    >
                      {dlBusy ? `Downloading… ${dlPct}%` : modelCached ? "Verify / Re-check Cache" : "Download Model Now"}
                    </button>
                  </div>
                  {(dlBusy || dlPct > 0) && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-muted">
                        <span>{dlBusy ? (dlStatus || `Downloading local AI… ${dlPct}%`) : "Model ready"}</span>
                        <span className="num">{dlPct}%</span>
                      </div>
                      <ProgressBar pct={Math.max(0.02, dlPct / 100)} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "data" && (
              <div className="flex max-w-xl flex-col gap-4 py-2">
                <div className="tile p-4 flex items-center gap-4">
                  <Illustration name="vault" tone="tools" className="hidden sm:block w-14 h-12" />
                  <div className="flex-1 min-w-0">
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
                </div>

                {cloudConfigured && (
                  <div className="tile p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold">
                        {cloudUser ? `Cloud Sync · ${cloudUser.email || cloudUser.name}` : "Cloud Sync (Supabase)"}
                      </p>
                      <p className="text-xs text-muted">
                        {cloudUser
                          ? "Syncs your local Dexie tables across devices."
                          : "Sign in to sync notes, tasks, XP, and pets across laptops."}
                      </p>
                    </div>
                    {cloudUser ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={syncing}
                          className="btn btn-lime btn-sm text-xs"
                          onClick={async () => {
                            setSyncing(true);
                            try {
                              const r = await syncWithCloud();
                              if (r.needsSchema) strobiSay("Run supabase/schema.sql in Supabase SQL Editor first.", "tip");
                              else strobiSay(`Synced: ${r.pushed} pushed, ${r.pulled} pulled.`, "tip");
                            } catch (er) {
                              strobiSay(er instanceof Error ? er.message : "Sync failed", "error");
                            }
                            setSyncing(false);
                          }}
                        >
                          {syncing ? "Syncing..." : "Sync now"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm text-xs"
                          onClick={async () => {
                            await fetch("/api/auth/logout", { method: "POST" });
                            setCloudUser(null);
                            strobiSay("Signed out of cloud sync", "tip");
                          }}
                        >
                          Sign out
                        </button>
                      </div>
                    ) : (
                      <Link href="/login" className="btn btn-ink btn-sm text-xs">
                        Sign in
                      </Link>
                    )}
                  </div>
                )}

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

                <div className="tile border-[1.5px] border-[var(--danger)]/40 bg-[var(--danger-tint)]/40 p-4 mt-2">
                  <p className="text-sm font-bold text-[var(--danger-text)]">Reset all data</p>
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
                      className="btn border-[var(--danger)] text-[var(--danger-text)] text-xs px-4"
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
