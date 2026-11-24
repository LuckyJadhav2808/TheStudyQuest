"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { differenceInCalendarDays, parseISO, subDays } from "date-fns";
import { useMemo, useState } from "react";
import { Plus } from "@phosphor-icons/react";
import { Panels } from "@/components/shell/Panels";
import { Card, CardTitle, CountUp, Empty, PageFrame, ProgressBar } from "@/components/ui/misc";
import { Field, Select } from "@/components/ui/fields";
import { db } from "@/core/db";
import { studyLogsRepo, testLogsRepo, tracksRepo } from "@/core/repos";
import type { SyllabusTrack, Topic, TopicStatus } from "@/core/types";
import { PRESETS } from "@/content/syllabus";
import { useRows } from "@/features/shared/hooks";
import { uid, todayKey } from "@/lib/utils";

const STATUSES: TopicStatus[] = ["pending", "in-progress", "revised", "mastered"];
const SLOTS = ["Slot 1", "Slot 2", "Slot 3", "Slot 4", "DPP"];
const HRS_PER_TOPIC = 2;

function mapTopics(t: SyllabusTrack, id: string, fn: (x: Topic) => Topic): SyllabusTrack["subjects"] {
  return t.subjects.map((s) => ({ ...s, units: s.units.map((u) => ({ ...u, topics: u.topics.map((x) => (x.id === id ? fn(x) : x)) })) }));
}
export function TrackerPage() {
  const tracks = useRows(tracksRepo) ?? [];
  const [sel, setSel] = useState<string>("");
  const track = tracks.find((t) => t.id === sel) ?? tracks[0];
  const logs = useLiveQuery(() => db.studyLogs.toArray(), [], []);
  const tests = useLiveQuery(() => db.testLogs.orderBy("date").reverse().toArray(), [], []);
  const [slot, setSlot] = useState("Slot 1");
  const [mins, setMins] = useState("60");
  const [subj, setSubj] = useState("");
  const [tf, setTf] = useState({ kind: "DPP" as "DPP" | "Topic" | "Subject" | "Mock", name: "", score: "", total: "", weak: "" });
  const [newSub, setNewSub] = useState("");

  const kpi = useMemo(() => {
    const live = logs.filter((l) => !l.deletedAt);
    const byDay = new Map<string, number>();
    live.forEach((l) => byDay.set(l.date, (byDay.get(l.date) ?? 0) + l.minutes));
    const total = live.reduce((a, l) => a + l.minutes, 0) / 60;
    const best = Math.max(0, ...byDay.values()) / 60;
    const last7 = Array.from({ length: 7 }, (_, i) => byDay.get(todayKey(subDays(new Date(), i))) ?? 0).reduce((a, b) => a + b, 0) / 60;
    const topics = track?.subjects.flatMap((s) => s.units.flatMap((u) => u.topics)) ?? [];
    const remaining = topics.filter((t) => t.status !== "mastered").length * HRS_PER_TOPIC;
    const pace = last7 / 7;
    const daysNeeded = pace > 0 ? Math.ceil(remaining / pace) : null;
    const left = track?.examDate ? differenceInCalendarDays(parseISO(track.examDate), new Date()) : null;
    const done = topics.filter((t) => t.status === "mastered" || t.status === "revised").length;
    return { total, avg: byDay.size ? total / byDay.size : 0, best, week: last7, remaining, daysNeeded, left, queue: topics.filter((t) => t.confidence <= 2), pct: topics.length ? done / topics.length : 0 };
  }, [logs, track]);

  const setTopic = (id: string, p: Partial<Topic>) => track && void tracksRepo.update(track.id, { subjects: mapTopics(track, id, (x) => ({ ...x, ...p })) });
  const load = async (pid: string) => {
    const p = PRESETS.find((x) => x.id === pid);
    if (!p) return;
    const t = await tracksRepo.add({ name: p.label, targetHoursPerWeek: p.hours, subjects: p.build() });
    setSel(t.id);
  };
  if (!track) {
    return (
      <PageFrame title="Tracker" subtitle="Syllabus, daily slots, tests and projections.">
        <Card><Empty title="Start a syllabus track" hint="Load a preset and tune it, or begin from the semester template." action={<div className="flex flex-wrap justify-center gap-2">{PRESETS.map((p) => <button key={p.id} className="btn btn-lime" onClick={() => void load(p.id)}>{p.label}</button>)}</div>} /></Card>
      </PageFrame>
    );
  }
  const overview = (
    <Card className="gap-3 overflow-y-auto">
      <CardTitle sub={track.name}>Overview</CardTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[["Days left", kpi.left ?? "-"], ["Hours total", kpi.total.toFixed(1)], ["Avg / day", kpi.avg.toFixed(1)], ["Best day", kpi.best.toFixed(1)], ["This week", kpi.week.toFixed(1)], ["Weekly target", track.targetHoursPerWeek]].map(([l, v]) => (
          <div key={String(l)} className="tile"><p className="text-xs font-bold text-muted">{l}</p><p className="font-display num text-3xl">{typeof v === "number" ? <CountUp value={v} /> : v}</p></div>
        ))}
      </div>
      <div className="tile"><div className="mb-2 flex justify-between text-sm font-bold"><span>Syllabus covered</span><span className="num">{Math.round(kpi.pct * 100)}%</span></div><ProgressBar pct={kpi.pct} /></div>
      <div className="tile text-sm"><p className="font-bold">Burndown projection</p><p className="text-muted">{kpi.daysNeeded === null ? "Log some study time to see a projection." : `${kpi.remaining}h of topics left. At your 7-day pace you finish in ${kpi.daysNeeded} days${kpi.left !== null ? (kpi.daysNeeded <= kpi.left ? ` (${kpi.left - kpi.daysNeeded} days spare).` : ` (${kpi.daysNeeded - kpi.left} days behind).`) : "."}`}</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Exam date"><input type="date" className="input" value={track.examDate ?? ""} onChange={(e) => void tracksRepo.update(track.id, { examDate: e.target.value || undefined })} /></Field>
        <Field label="Weekly hours target"><input type="number" min={1} className="input" value={track.targetHoursPerWeek} onChange={(e) => void tracksRepo.update(track.id, { targetHoursPerWeek: Number(e.target.value) || 1 })} /></Field>
      </div>
      <div><p className="mb-2 text-sm font-bold">Priority revision queue (confidence 2 or lower)</p>
        {kpi.queue.length === 0 ? <p className="text-sm text-muted">Nothing urgent. Nice.</p> : <div className="flex flex-wrap gap-2">{kpi.queue.slice(0, 20).map((t) => <span key={t.id} className="chip bg-peach text-ink">{t.name} · {t.confidence}/5</span>)}</div>}</div>
    </Card>
  );
  const syllabus = (
    <Card className="gap-3">
      <CardTitle right={<div className="flex gap-2"><Select className="!min-h-9 max-w-40" value={track.id} onChange={setSel} options={tracks.map((t) => ({ value: t.id, label: t.name }))} /><Select className="!min-h-9 max-w-36" value="" onChange={(v) => v && void load(v)} options={[{ value: "", label: "Load preset" }, ...PRESETS.map((p) => ({ value: p.id, label: p.label }))]} /></div>}>Syllabus</CardTitle>
      <div className="scroll-thin min-h-0 flex-1 space-y-4">
        {track.subjects.map((s) => (
          <section key={s.id} className="tile">
            <h3 className="font-display text-lg">{s.name} <span className="text-xs font-bold text-muted">weight {s.weight}%</span></h3>
            {s.units.map((u) => (
              <div key={u.id} className="mt-2"><p className="text-xs font-bold uppercase tracking-wider text-muted">{u.name}</p>
                {u.topics.map((t) => (
                  <div key={t.id} className="flex flex-wrap items-center gap-2 border-b border-line/10 py-1.5 text-sm">
                    <span className="min-w-32 flex-1 font-semibold">{t.name}</span>
                    <span role="radiogroup" aria-label={`Confidence for ${t.name}`} className="flex gap-0.5">{[1, 2, 3, 4, 5].map((c) => <button key={c} role="radio" aria-checked={t.confidence === c} aria-label={`${c} of 5`} onClick={() => setTopic(t.id, { confidence: c })} className={`size-6 rounded-full border border-line/40 text-[11px] font-bold ${t.confidence >= c ? "bg-lime text-ink" : ""}`}>{c}</button>)}</span>
                    <button className="chip !min-h-7 !px-2 text-xs" aria-label={`Revisions for ${t.name}`} onClick={() => setTopic(t.id, { revisions: t.revisions + 1 })}>R{t.revisions}+</button>
                    <select aria-label={`Status for ${t.name}`} className="input !min-h-7 w-28 !px-2 text-xs" value={t.status} onChange={(e) => setTopic(t.id, { status: e.target.value as TopicStatus })}>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select>
                  </div>
                ))}
              </div>
            ))}
          </section>
        ))}
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!newSub.trim()) return; void tracksRepo.update(track.id, { subjects: [...track.subjects, { id: uid(), name: newSub.trim(), weight: 5, units: [{ id: uid(), name: "General", topics: [{ id: uid(), name: "First topic", weight: 1, confidence: 3, revisions: 0, status: "pending" }] }] }] }); setNewSub(""); }}>
          <input className="input" placeholder="Add a subject" value={newSub} onChange={(e) => setNewSub(e.target.value)} /><button className="btn btn-ink" type="submit"><Plus size={16} weight="bold" />Add</button>
        </form>
      </div>
    </Card>
  );
  const log = (
    <Card className="gap-3">
      <CardTitle sub="Slots, DPPs and test scores">Daily log and tests</CardTitle>
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void studyLogsRepo.add({ date: todayKey(), slot, minutes: Number(mins) || 0, subject: subj || "General", trackId: track.id }); }}>
        <Select className="max-w-28" value={slot} onChange={setSlot} options={SLOTS.map((s) => ({ value: s, label: s }))} />
        <input className="input w-24" type="number" aria-label="Minutes" value={mins} onChange={(e) => setMins(e.target.value)} />
        <input className="input min-w-28 flex-1" placeholder="Subject" aria-label="Subject" value={subj} onChange={(e) => setSubj(e.target.value)} />
        <button className="btn btn-lime" type="submit">Log</button>
      </form>
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void testLogsRepo.add({ date: todayKey(), kind: tf.kind, name: tf.name || tf.kind, score: Number(tf.score) || 0, total: Number(tf.total) || 100, weakTopics: tf.weak.split(",").map((x) => x.trim()).filter(Boolean) }); setTf({ ...tf, name: "", score: "", total: "", weak: "" }); }}>
        <Select className="max-w-28" value={tf.kind} onChange={(v) => setTf({ ...tf, kind: v as typeof tf.kind })} options={["DPP", "Topic", "Subject", "Mock"].map((s) => ({ value: s, label: s }))} />
        <input className="input min-w-28 flex-1" placeholder="Test name" aria-label="Test name" value={tf.name} onChange={(e) => setTf({ ...tf, name: e.target.value })} />
        <input className="input w-20" type="number" placeholder="Score" aria-label="Score" value={tf.score} onChange={(e) => setTf({ ...tf, score: e.target.value })} />
        <input className="input w-20" type="number" placeholder="Total" aria-label="Total" value={tf.total} onChange={(e) => setTf({ ...tf, total: e.target.value })} />
        <input className="input min-w-28 flex-1" placeholder="Weak topics, comma separated" aria-label="Weak topics" value={tf.weak} onChange={(e) => setTf({ ...tf, weak: e.target.value })} />
        <button className="btn btn-lime" type="submit">Add test</button>
      </form>
      <div className="scroll-thin min-h-0 flex-1">
        <table className="w-full text-left text-sm"><thead className="text-xs text-muted"><tr><th>Date</th><th>Test</th><th>Score</th><th>%</th><th>Weak</th></tr></thead>
          <tbody>{tests.filter((t) => !t.deletedAt).map((t) => <tr key={t.id} className="border-t border-line/10"><td className="num py-1.5">{t.date}</td><td>{t.kind}: {t.name}</td><td className="num">{t.score}/{t.total}</td><td className="num font-bold">{Math.round((t.score / t.total) * 100)}%</td><td className="text-xs text-muted">{t.weakTopics.join(", ")}</td></tr>)}</tbody></table>
        {tests.length === 0 && <Empty title="No tests logged" hint="Add a DPP or mock score above." />}
      </div>
    </Card>
  );
  return (
    <PageFrame title="Tracker" subtitle="Syllabus coverage, study hours and test ledger in one place.">
      <Panels className="lg:grid-cols-12" panels={[{ id: "ov", label: "Overview", className: "lg:col-span-4", node: overview }, { id: "syl", label: "Syllabus", className: "lg:col-span-5", node: syllabus }, { id: "log", label: "Log", className: "lg:col-span-3 sm:col-span-2", node: log }]} />
    </PageFrame>
  );
}
