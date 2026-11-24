"use client";
import { useState } from "react";
import { DownloadSimple, Plus } from "@phosphor-icons/react";
import { addDays, format, startOfWeek } from "date-fns";
import { Panels } from "@/components/shell/Panels";
import { Card, Empty, PageFrame } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { Field, Select } from "@/components/ui/fields";
import { timetableRepo } from "@/core/repos";
import type { TimetableBlock } from "@/core/types";
import { deleteWithUndo, useRows } from "@/features/shared/hooks";
import { downloadBlob } from "@/lib/utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ICAL = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const COLORS = ["#D9FF45", "#FFE2D2", "#E8E4FF", "#1FD6C1", "#FF8B4A", "#2E8BFF"];

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
    <Card className="gap-2" lift={false}>
      <h2 className={`card-title ${d === dayIdx ? "text-violet" : ""}`}>{DAYS[d]}{d === dayIdx && " · today"}</h2>
      <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-2">
        {blocks.filter((b) => b.day === d).sort((a, b) => a.start.localeCompare(b.start)).map((b) => {
          const cur = d === dayIdx && hm >= b.start && hm < b.end;
          return (
            <div key={b.id} className={`rounded-[20px] border-[1.5px] p-2.5 text-ink ${cur ? "border-ink shadow-[0_0_0_3px_#D9FF45]" : "border-ink/60"}`} style={{ background: b.color }}>
              <p className="num text-[11px] font-bold">{b.start} - {b.end}{cur && " · now"}</p><p className="text-sm font-bold">{b.title}</p><p className="text-[11px]">{[b.room, b.professor].filter(Boolean).join(" · ")}</p>
              <button className="mt-1 text-[11px] font-semibold underline" onClick={() => void deleteWithUndo(timetableRepo, b.id, "class")}>Remove</button>
            </div>
          );
        })}
        {!blocks.some((b) => b.day === d) && <p className="text-xs text-muted">Free day.</p>}
      </div>
    </Card>
  );
  return (
    <PageFrame title="Timetable" subtitle="Your week at a glance. Export to any calendar." actions={<><button className="btn" onClick={() => downloadBlob("studyquest-timetable.ics", toIcs(blocks), "text/calendar")} disabled={!blocks.length}><DownloadSimple size={18} weight="bold" /><span className="hidden sm:inline">.ics</span></button><button className="btn btn-lime" onClick={() => setOpen(true)}><Plus size={18} weight="bold" />Add class</button></>}>
      {blocks.length === 0 && <Card className="shrink-0"><Empty title="Empty week" hint="Add your first class to see the grid come alive." action={<button className="btn btn-lime" onClick={() => setOpen(true)}>Add class</button>} /></Card>}
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
