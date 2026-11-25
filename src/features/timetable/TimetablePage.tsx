"use client";
import { useState } from "react";
import { DownloadSimple, Plus } from "@phosphor-icons/react";
import { addDays, format, startOfWeek } from "date-fns";
import { Panels } from "@/components/shell/Panels";
import { BentoCard } from "@/components/shell/BentoCard";
import { HeroCard } from "@/components/ui/design-primitives";
import { PageFrame } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { Field, Select } from "@/components/ui/fields";
import { timetableRepo } from "@/core/repos";
import type { TimetableBlock } from "@/core/types";
import { deleteWithUndo, useRows } from "@/features/shared/hooks";
import { downloadBlob } from "@/lib/utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ICAL = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const COLORS = ["var(--primary)", "var(--domain-quests-tint)", "var(--domain-notes-tint)", "var(--domain-stats-fill)", "var(--domain-quests-fill)", "var(--domain-tools-fill)"];

function toIcs(blocks: TimetableBlock[]): string {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const ev = blocks.map((b) => {
    const d = format(addDays(monday, b.day), "yyyyMMdd");
    const t = (s: string) => s.replace(":", "") + "00";
    return ["BEGIN:VEVENT", `UID:${b.id}@studyquest`, `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss")}`, `DTSTART:${d}T${t(b.start)}`, `DTEND:${d}T${t(b.end)}`, `RRULE:FREQ=WEEKLY;BYDAY=${ICAL[b.day]}`, `SUMMARY:${b.title}`, `LOCATION:${b.room}`, `DESCRIPTION:${b.professor}`, "END:VEVENT"].join("\r\n");
  });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//StudyQuest//Timetable//EN", ...ev, "END:VCALENDAR"].join("\r\n");
}
export function TimetablePage() {
  const blocks = useRows(timetableRepo) ?? [];
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ day: "0", start: "09:00", end: "10:00", title: "", room: "", professor: "", color: COLORS[0] });
  const now = new Date();
  const dayIdx = (now.getDay() + 6) % 7;
  const hm = format(now, "HH:mm");
  const col = (d: number) => (
    <BentoCard
      title={`${DAYS[d]}${d === dayIdx ? " · today" : ""}`}
      className={`h-full ${d === dayIdx ? "surface-inverse" : ""}`}
      lift={false}
    >
      <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-2">
        {d === dayIdx && (
          <div className="flex items-center gap-1.5 py-0.5" aria-label={`Current time ${hm}`}>
            <span className="size-2 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
            <span className="h-[1.5px] flex-1 bg-primary/70" />
            <span className="num text-[10px] font-extrabold uppercase tracking-wider text-primary">{hm}</span>
          </div>
        )}
        {blocks.filter((b) => b.day === d).sort((a, b) => a.start.localeCompare(b.start)).map((b) => {
          const cur = d === dayIdx && hm >= b.start && hm < b.end;
          return (
            <div key={b.id} className={`rounded-[20px] border-[1.5px] p-3 text-on-primary transition hover:-translate-y-0.5 ${cur ? "border-border-strong shadow-[0_0_0_3px_var(--primary)]" : "border-border-strong/50"}`} style={{ background: b.color }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="num text-[11px] font-bold opacity-80">{b.start} – {b.end}{cur && " · LIVE"}</p>
                  <p className="text-sm font-extrabold leading-tight mt-0.5">{b.title}</p>
                </div>
                <button
                  className="grid size-6 shrink-0 place-items-center rounded-full border border-black/25 bg-white/35 text-[10px] font-extrabold hover:bg-white/60"
                  aria-label={`Remove ${b.title}`}
                  onClick={() => void deleteWithUndo(timetableRepo, b.id, "class")}
                >
                  ×
                </button>
              </div>
              {[b.room, b.professor].filter(Boolean).length > 0 && (
                <p className="mt-1 text-[11px] font-semibold opacity-80">{[b.room, b.professor].filter(Boolean).join(" · ")}</p>
              )}
            </div>
          );
        })}
        {!blocks.some((b) => b.day === d) && <p className="text-xs text-muted">Free day.</p>}
      </div>
    </BentoCard>
  );
  return (
    <PageFrame title="Timetable" subtitle="Your week at a glance. Export to any calendar." actions={<><button className="btn" onClick={() => downloadBlob("studyquest-timetable.ics", toIcs(blocks), "text/calendar")} disabled={!blocks.length}><DownloadSimple size={18} weight="bold" /><span className="hidden sm:inline">.ics</span></button><button className="btn btn-lime" onClick={() => setOpen(true)}><Plus size={18} weight="bold" />Add class</button></>}>
      {blocks.length === 0 && (
        <HeroCard tint="quests" autoHeight hardShadow={false} className="shrink-0 mb-3 !h-auto">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-base font-extrabold">Empty week</p>
              <p className="text-xs text-muted">Add your first class to see the grid come alive.</p>
            </div>
            <button className="btn btn-lime btn-sm" onClick={() => setOpen(true)}>Add class</button>
          </div>
        </HeroCard>
      )}
      <Panels className="sm:grid-cols-4 lg:grid-cols-7" panels={DAYS.map((_, d) => ({ id: String(d), label: DAYS[d], node: col(d) }))} />
      <Modal open={open} onClose={() => setOpen(false)} title="Add class">
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (!f.title.trim()) return; void timetableRepo.add({ ...f, day: Number(f.day) }); setOpen(false); setF({ ...f, title: "" }); }}>
          <Field label="Subject"><input className="input" autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <div className="grid grid-cols-3 gap-2"><Field label="Day"><Select value={f.day} onChange={(v) => setF({ ...f, day: v })} options={DAYS.map((d, i) => ({ value: String(i), label: d }))} /></Field><Field label="Start"><input type="time" className="input" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field><Field label="End"><input type="time" className="input" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field></div>
          <div className="grid grid-cols-2 gap-2"><Field label="Room"><input className="input" value={f.room} onChange={(e) => setF({ ...f, room: e.target.value })} /></Field><Field label="Professor"><input className="input" value={f.professor} onChange={(e) => setF({ ...f, professor: e.target.value })} /></Field></div>
          <div className="flex gap-2" role="radiogroup" aria-label="Colour">{COLORS.map((c) => <button type="button" key={c} role="radio" aria-checked={f.color === c} aria-label={c} onClick={() => setF({ ...f, color: c })} className="size-9 rounded-full border-2" style={{ background: c, borderColor: f.color === c ? "var(--fg)" : "transparent" }} />)}</div>
          <button className="btn btn-lime" type="submit">Add to timetable</button>
        </form>
      </Modal>
    </PageFrame>
  );
}
