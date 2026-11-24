"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Panels } from "@/components/shell/Panels";
import { Card, CardTitle, PageFrame, ProgressBar } from "@/components/ui/misc";
import { Field, Select } from "@/components/ui/fields";
import { useUI } from "@/components/shell/ui-store";
import { DEFAULT_FLAGS, useFlags, type FlagName } from "@/core/flags";
import { updateSettings, useSettings } from "@/core/settings";
import type { ThemeName } from "@/core/types";
import { strobiSay } from "@/features/strobi/toast";
import { playSfx } from "@/lib/audio";
import { exportBackup, importBackup, resetAll } from "./dataTools";

const THEMES: { id: ThemeName; label: string; bg: string }[] = [{ id: "paper", label: "Paper", bg: "#F5F5F2" }, { id: "ink", label: "Ink", bg: "#0B0B0C" }, { id: "lavender", label: "Lavender", bg: "#E8E4FF" }, { id: "peach", label: "Peach", bg: "#FFE2D2" }];
const hue = (s: string) => [...s].reduce((a, c) => a + c.charCodeAt(0) * 7, 0) % 360;

function Range({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return <label className="flex items-center gap-3 text-sm font-bold"><span className="w-24 shrink-0">{label}</span><input type="range" min={0} max={1} step={0.05} value={value} onChange={(e) => onChange(+e.target.value)} className="min-w-0 flex-1 accent-ink" /></label>;
}
export function SettingsPage() {
  const s = useSettings();
  const flags = useFlags();
  const setUI = useUI((x) => x.set);
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null);
  const [confirm, setConfirm] = useState("");
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => { void navigator.storage?.estimate?.().then((e) => setUsage({ used: e.usage ?? 0, quota: e.quota ?? 1 })); }, []);
  const notify = async (on: boolean) => {
    if (!on) return void updateSettings({ notifications: false });
    if (!("Notification" in window)) return strobiSay("Notifications are not supported here.", "error");
    const p = await Notification.requestPermission();
    if (p === "granted") void updateSettings({ notifications: true }); else strobiSay("No problem. Notifications stay off.", "tip");
  };
  const profile = (
    <Card className="gap-3 overflow-y-auto">
      <CardTitle sub="Guest profile, stored on this device">Profile</CardTitle>
      <div className="flex items-center gap-3"><span className="font-display grid size-16 place-items-center rounded-full border-[3px] border-ink text-2xl text-ink" style={{ background: `hsl(${hue(s.avatarSeed)} 80% 75%)` }} aria-hidden>{s.name.slice(0, 1).toUpperCase()}</span><div><p className="font-display text-xl">{s.name}</p><p className="text-xs text-muted">{s.title}</p></div></div>
      <Field label="Display name"><input className="input" defaultValue={s.name} onBlur={(e) => void updateSettings({ name: e.target.value.trim() || "Scholar" })} /></Field>
      <Field label="Avatar seed"><input className="input" defaultValue={s.avatarSeed} onBlur={(e) => void updateSettings({ avatarSeed: e.target.value })} /></Field>
      <Field label="Main goal"><input className="input" defaultValue={s.goal} onBlur={(e) => void updateSettings({ goal: e.target.value })} /></Field>
      <Field label="Daily focus goal (minutes)"><input className="input" type="number" min={10} defaultValue={s.focusGoalMin} onBlur={(e) => void updateSettings({ focusGoalMin: Math.max(10, Number(e.target.value) || 120) })} /></Field>
      <label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" className="size-5 accent-ink" checked={s.notifications} onChange={(e) => void notify(e.target.checked)} />Notify me when a break ends or a streak is at risk</label>
      <div className="flex flex-wrap gap-2"><Link className="btn btn-sm" href="/login">Character creation</Link><Link className="btn btn-sm" href="/privacy">Privacy</Link><button className="btn btn-sm" onClick={() => setUI({ changelog: true })}>Version 1.0.0</button><button className="btn btn-sm" onClick={() => setUI({ shortcuts: true })}>Shortcuts</button></div>
    </Card>
  );
  const look = (
    <Card className="gap-3 overflow-y-auto">
      <CardTitle>Appearance and sound</CardTitle>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Theme">{THEMES.map((t) => <button key={t.id} role="radio" aria-checked={s.theme === t.id} onClick={() => void updateSettings({ theme: t.id })} className={`flex min-h-12 items-center gap-2 rounded-full border-[1.5px] px-3 text-sm font-bold ${s.theme === t.id ? "border-line bg-lime text-ink" : "border-line/40"}`}><span className="size-6 rounded-full border border-ink/40" style={{ background: t.bg }} />{t.label}</button>)}</div>
      <Range label="Master" value={s.masterVolume} onChange={(v) => void updateSettings({ masterVolume: v })} />
      <Range label="Effects" value={s.sfxVolume} onChange={(v) => void updateSettings({ sfxVolume: v })} />
      <Range label="Music" value={s.musicVolume} onChange={(v) => void updateSettings({ musicVolume: v })} />
      <div className="flex gap-2"><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="size-5 accent-ink" checked={s.muted} onChange={(e) => void updateSettings({ muted: e.target.checked })} />Mute all</label><button className="btn btn-sm ml-auto" onClick={() => playSfx("level")}>Test sound</button></div>
      <p className="text-sm font-bold">AI provider</p>
      <Select value={s.aiProvider} onChange={(v) => void updateSettings({ aiProvider: v as typeof s.aiProvider })} options={[{ value: "openrouter", label: "OpenRouter" }, { value: "openai", label: "OpenAI" }, { value: "google", label: "Google Gemini" }]} />
      <Field label="Model"><input className="input" defaultValue={s.aiModel} onBlur={(e) => void updateSettings({ aiModel: e.target.value.trim() })} /></Field>
      <Field label="API key (stored on this device, sent per request, never logged)"><input className="input" type="password" autoComplete="off" defaultValue={s.aiKey} onBlur={(e) => void updateSettings({ aiKey: e.target.value.trim() })} placeholder="sk-..." /></Field>
    </Card>
  );
  const data = (
    <Card className="gap-3 overflow-y-auto">
      <CardTitle sub="Everything stays in this browser unless you export it">Data and features</CardTitle>
      <div className="tile">{usage ? <><div className="mb-1 flex justify-between text-sm font-bold"><span>Storage used</span><span className="num">{(usage.used / 1048576).toFixed(1)} MB of {(usage.quota / 1073741824).toFixed(1)} GB</span></div><ProgressBar pct={Math.max(0.01, usage.used / usage.quota)} /></> : <p className="text-sm text-muted">Storage estimate is unavailable.</p>}<button className="btn btn-sm mt-2" onClick={async () => strobiSay((await navigator.storage?.persist?.()) ? "Storage will be kept." : "The browser declined to persist storage.", "tip")}>Request persistent storage</button></div>
      <div className="flex flex-wrap gap-2"><button className="btn btn-ink" onClick={() => void exportBackup()}>Export backup</button><button className="btn" onClick={() => file.current?.click()}>Restore backup</button><input ref={file} hidden type="file" accept=".json" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { await importBackup(await f.text()); strobiSay("Backup restored.", "tip"); } catch (er) { strobiSay(er instanceof Error ? er.message : "Restore failed", "error"); } e.target.value = ""; }} /></div>
      <p className="text-sm font-bold">Feature flags</p>
      <div className="grid gap-1 sm:grid-cols-2">{(Object.keys(DEFAULT_FLAGS) as FlagName[]).map((k) => <label key={k} className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-ink" checked={flags[k]} onChange={(e) => void updateSettings({ flags: { ...s.flags, [k]: e.target.checked } })} />{k}</label>)}</div>
      <div className="tile border-[1.5px] border-red-400"><p className="font-bold text-red-600">Reset all data</p><p className="text-xs text-muted">Type RESET to wipe every table on this device. This cannot be undone.</p><div className="mt-2 flex gap-2"><input className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="Type RESET to confirm" /><button className="btn border-red-500 text-red-600" disabled={confirm !== "RESET"} onClick={async () => { await resetAll(); location.href = "/"; }}>Wipe</button></div></div>
    </Card>
  );
  return (
    <PageFrame title="Settings" subtitle="Profile, look, sound, AI and your data.">
      <Panels className="lg:grid-cols-12" panels={[{ id: "p", label: "Profile", className: "lg:col-span-4", node: profile }, { id: "l", label: "Look and AI", className: "lg:col-span-4", node: look }, { id: "d", label: "Data", className: "lg:col-span-4 sm:col-span-2", node: data }]} />
    </PageFrame>
  );
}
