"use client";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "@phosphor-icons/react";
import { Panels } from "@/components/shell/Panels";
import { Card, CardTitle, Empty, PageFrame, ProgressBar } from "@/components/ui/misc";
import { Field } from "@/components/ui/fields";
import { emit } from "@/core/events";
import { examsRepo, tracksRepo } from "@/core/repos";
import { QUESTIONS } from "@/content/questions";
import { deleteWithUndo, useRows } from "@/features/shared/hooks";
import { fmtClock, todayKey, uid } from "@/lib/utils";
import type { Exam } from "@/core/types";

const radar = (d: number) => (d > 30 ? { c: "#1FD6C1", l: "Comfortable" } : d >= 7 ? { c: "#FFB020", l: "Closing in" } : { c: "#FF5A4A", l: "Crunch time" });

function Mock({ onClose }: { onClose: () => void }) {
  const qs = useMemo(() => [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 10), []);
  const [ans, setAns] = useState<Record<number, number>>({});
  const [i, setI] = useState(0);
  const [end, setEnd] = useState(() => Date.now() + 10 * 60000);
  const [now, setNow] = useState(Date.now());
  const [done, setDone] = useState(false);
  useEffect(() => { void document.documentElement.requestFullscreen?.().catch(() => undefined); const t = setInterval(() => setNow(Date.now()), 500); return () => { clearInterval(t); if (document.fullscreenElement) void document.exitFullscreen(); }; }, []);
  useEffect(() => { if (now >= end && !done) finish(); });
  const score = qs.filter((q, k) => ans[k] === q.answer).length;
  function finish() { setDone(true); setEnd(0); if (score / qs.length >= 0.6) emit("quiz.passed", { xp: score * 5, label: "Mock test" }); }
  return (
    <div className="fixed inset-0 z-[90] flex flex-col gap-4 overflow-y-auto bg-canvas p-4 sm:p-8" role="dialog" aria-label="Mock exam">
      <div className="flex items-center justify-between"><h2 className="font-display text-3xl">Mock exam</h2>{!done && <span className="chip num text-base">{fmtClock(end - now)}</span>}<button className="btn btn-icon" aria-label="Leave mock" onClick={onClose}><X size={20} weight="bold" /></button></div>
      {done ? (
        <Card className="mx-auto w-full max-w-xl items-center gap-3 text-center"><p className="font-display num text-7xl">{score}/{qs.length}</p><p className="text-muted">{Math.round((score / qs.length) * 100)}%. Weak topics: {[...new Set(qs.filter((q, k) => ans[k] !== q.answer).map((q) => q.topic))].join(", ") || "none"}</p><button className="btn btn-lime" onClick={onClose}>Close report</button></Card>
      ) : (
        <Card className="mx-auto w-full max-w-2xl gap-4">
          <p className="num text-xs font-bold text-muted">Question {i + 1} of {qs.length}</p>
          <p className="font-display text-2xl">{qs[i].q}</p>
          <div className="flex flex-col gap-2" role="radiogroup">{qs[i].options.map((o, k) => <button key={o} role="radio" aria-checked={ans[i] === k} onClick={() => setAns({ ...ans, [i]: k })} className={`tile min-h-12 border-[1.5px] text-left font-semibold ${ans[i] === k ? "border-line bg-lime text-ink" : "border-transparent"}`}>{o}</button>)}</div>
          <div className="flex justify-between"><button className="btn" disabled={i === 0} onClick={() => setI(i - 1)}>Previous</button>{i < qs.length - 1 ? <button className="btn btn-ink" onClick={() => setI(i + 1)}>Next</button> : <button className="btn btn-lime" onClick={finish}>Submit</button>}</div>
        </Card>
      )}
    </div>
  );
}
export function ExamsPage() {
  const exams = useRows(examsRepo) ?? [];
  const tracks = useRows(tracksRepo) ?? [];
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayKey());
  const [mock, setMock] = useState(false);
  const sorted = [...exams].sort((a, b) => a.date.localeCompare(b.date));
  const patch = (e: Exam, items: Exam["checklist"]) => void examsRepo.update(e.id, { checklist: items });
  const radarCard = (
    <Card className="gap-3">
      <CardTitle right={<button className="btn btn-ink btn-sm" onClick={() => setMock(true)}>Mock exam</button>}>Countdown radar</CardTitle>
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (title.trim()) { void examsRepo.add({ title: title.trim(), date, checklist: [] }); setTitle(""); } }}>
        <input className="input min-w-32 flex-1" placeholder="Exam name" aria-label="Exam name" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input w-40" type="date" aria-label="Exam date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button className="btn btn-lime" type="submit"><Plus size={16} weight="bold" />Add</button>
      </form>
      <div className="scroll-thin grid min-h-0 flex-1 content-start gap-3 sm:grid-cols-2">
        {sorted.length === 0 && <div className="col-span-full"><Empty title="No exams on the radar" hint="Add one above and watch the countdown." /></div>}
        {sorted.map((e) => { const d = differenceInCalendarDays(parseISO(e.date), new Date()); const r = radar(d); const cov = e.checklist.length ? e.checklist.filter((c) => c.done).length / e.checklist.length : 0;
          return (
            <div key={e.id} className="tile flex flex-col gap-2 border-[1.5px] border-line" style={{ background: `color-mix(in srgb, ${r.c} 30%, var(--surface))` }}>
              <div className="flex items-start justify-between"><div><p className="font-bold">{e.title}</p><p className="text-xs text-muted">{r.l} · {e.date}</p></div><p className="font-display num text-4xl leading-none">{d < 0 ? "Done" : d}</p></div>
              <ProgressBar pct={cov} color={r.c} /><p className="num text-xs text-muted">{Math.round(cov * 100)}% coverage</p>
              <button className="self-end text-xs font-semibold text-muted" onClick={() => void deleteWithUndo(examsRepo, e.id, "exam")}>Remove</button>
            </div>
          ); })}
      </div>
    </Card>
  );
  const coverage = (
    <Card className="gap-3">
      <CardTitle sub="Linked to tracker topics">Coverage checklists</CardTitle>
      <div className="scroll-thin min-h-0 flex-1 space-y-3">
        {sorted.length === 0 && <Empty title="Nothing to cover yet" />}
        {sorted.map((e) => (
          <section key={e.id} className="tile">
            <div className="flex items-center justify-between gap-2"><h3 className="font-bold">{e.title}</h3>
              {tracks.length > 0 && <button className="chip !min-h-7 text-xs" onClick={() => patch(e, [...e.checklist, ...tracks[0].subjects.flatMap((s) => s.units.flatMap((u) => u.topics)).filter((t) => !e.checklist.some((c) => c.text === t.name)).map((t) => ({ id: uid(), text: t.name, done: t.status === "mastered" }))])}>Import tracker topics</button>}</div>
            {e.checklist.map((c) => <label key={c.id} className="flex min-h-9 items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-ink" checked={c.done} onChange={() => patch(e, e.checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)))} /><span className={c.done ? "line-through opacity-60" : ""}>{c.text}</span></label>)}
            <form className="mt-1" onSubmit={(ev) => { ev.preventDefault(); const f = new FormData(ev.currentTarget).get("t"); if (typeof f === "string" && f.trim()) { patch(e, [...e.checklist, { id: uid(), text: f.trim(), done: false }]); ev.currentTarget.reset(); } }}><Field label=""><input name="t" className="input !min-h-9" placeholder="Add a topic to cover" /></Field></form>
          </section>
        ))}
      </div>
    </Card>
  );
  return (
    <PageFrame title="Exams" subtitle="Countdowns, coverage and a timed mock simulator.">
      <Panels className="lg:grid-cols-12" panels={[{ id: "r", label: "Radar", className: "lg:col-span-7 sm:col-span-2", node: radarCard }, { id: "c", label: "Coverage", className: "lg:col-span-5 sm:col-span-2", node: coverage }]} />
      {mock && <Mock onClose={() => setMock(false)} />}
    </PageFrame>
  );
}
