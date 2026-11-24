"use client";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "@phosphor-icons/react";
import { Panels } from "@/components/shell/Panels";
import { BentoCard } from "@/components/shell/BentoCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Empty, PageFrame, ProgressBar } from "@/components/ui/misc";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/fields";
import { emit } from "@/core/events";
import { examsRepo, tracksRepo } from "@/core/repos";
import { QUESTIONS } from "@/content/questions";
import { deleteWithUndo, useRows } from "@/features/shared/hooks";
import { fmtClock, todayKey, uid } from "@/lib/utils";
import type { Exam } from "@/core/types";

const radar = (d: number) =>
  d > 30
    ? { c: "#1FD6C1", l: "Comfortable" }
    : d >= 7
    ? { c: "#FFB020", l: "Closing in" }
    : { c: "#FF5A4A", l: "Crunch time" };

function Mock({ onClose }: { onClose: () => void }) {
  const qs = useMemo(() => [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 10), []);
  const [ans, setAns] = useState<Record<number, number>>({});
  const [i, setI] = useState(0);
  const [end, setEnd] = useState(() => Date.now() + 10 * 60000);
  const [now, setNow] = useState(Date.now());
  const [done, setDone] = useState(false);

  useEffect(() => {
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => {
      clearInterval(t);
      if (document.fullscreenElement) void document.exitFullscreen();
    };
  }, []);

  useEffect(() => {
    if (now >= end && !done) finish();
  });

  const score = qs.filter((q, k) => ans[k] === q.answer).length;
  function finish() {
    setDone(true);
    setEnd(0);
    if (score / qs.length >= 0.6) emit("quiz.passed", { xp: score * 5, label: "Mock test" });
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col gap-4 overflow-y-auto bg-canvas p-4 sm:p-8"
      role="dialog"
      aria-label="Mock exam"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-3xl font-extrabold">Mock exam</h2>
        {!done && <span className="chip num text-base font-bold">{fmtClock(end - now)}</span>}
        <button className="btn btn-icon" aria-label="Leave mock" onClick={onClose}>
          <X size={20} weight="bold" />
        </button>
      </div>
      {done ? (
        <div className="mx-auto w-full max-w-xl">
          <BentoCard title="Exam Results" className="items-center gap-3 text-center p-6">
            <p className="font-display num text-7xl font-black">{score}/{qs.length}</p>
            <p className="text-muted text-sm">
              {Math.round((score / qs.length) * 100)}%. Weak topics:{" "}
              {[...new Set(qs.filter((q, k) => ans[k] !== q.answer).map((q) => q.topic))].join(", ") || "none"}
            </p>
            <button className="btn btn-lime mt-2" onClick={onClose}>
              Close report
            </button>
          </BentoCard>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-2xl">
          <BentoCard title={`Question ${i + 1} of ${qs.length}`} className="gap-4 p-6">
            <p className="font-display text-2xl font-bold">{qs[i].q}</p>
            <div className="flex flex-col gap-2" role="radiogroup">
              {qs[i].options.map((o, k) => (
                <button
                  key={o}
                  role="radio"
                  aria-checked={ans[i] === k}
                  onClick={() => setAns({ ...ans, [i]: k })}
                  className={`tile min-h-12 border-[1.5px] p-3 text-left font-semibold transition ${
                    ans[i] === k ? "border-ink bg-lime text-ink shadow-xs" : "border-transparent hover:bg-soft"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
            <div className="flex justify-between pt-2">
              <button className="btn" disabled={i === 0} onClick={() => setI(i - 1)}>
                Previous
              </button>
              {i < qs.length - 1 ? (
                <button className="btn btn-ink" onClick={() => setI(i + 1)}>
                  Next
                </button>
              ) : (
                <button className="btn btn-lime" onClick={finish}>
                  Submit
                </button>
              )}
            </div>
          </BentoCard>
        </div>
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
    <BentoCard
      title="Countdown radar"
      action={
        <button className="btn btn-ink btn-sm text-xs" onClick={() => setMock(true)}>
          Mock exam
        </button>
      }
      className="gap-2.5 h-full"
    >
      <form
        className="flex flex-wrap items-center gap-2 shrink-0 pb-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) {
            void examsRepo.add({ title: title.trim(), date, checklist: [] });
            setTitle("");
          }
        }}
      >
        <input
          className="input min-w-32 flex-1 !min-h-9 text-xs"
          placeholder="Exam name"
          aria-label="Exam name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="input w-36 !min-h-9 text-xs"
          type="date"
          aria-label="Exam date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button className="btn btn-lime !min-h-9 px-4 text-xs font-bold shrink-0" type="submit">
          <Plus size={16} weight="bold" />
          Add
        </button>
      </form>

      <ScrollArea className="flex-1 min-h-0 pr-1">
        <div className="grid content-start gap-2.5 sm:grid-cols-2 pb-2">
          {sorted.length === 0 && (
            <div className="col-span-full">
              <Empty title="No exams on the radar" hint="Add one above to watch the countdown." />
            </div>
          )}
          {sorted.map((e) => {
            const d = differenceInCalendarDays(parseISO(e.date), new Date());
            const r = radar(d);
            const cov = e.checklist.length
              ? e.checklist.filter((c) => c.done).length / e.checklist.length
              : 0;
            return (
              <div
                key={e.id}
                className="tile flex flex-col gap-2 border-[1.5px] border-line p-3"
                style={{ background: `color-mix(in srgb, ${r.c} 25%, var(--color-surface))` }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-sm truncate">{e.title}</p>
                    <p className="text-[11px] text-muted">
                      {r.l} · {e.date}
                    </p>
                  </div>
                  <p className="font-display num text-3xl font-black leading-none">{d < 0 ? "Done" : d}</p>
                </div>
                <ProgressBar pct={cov} color={r.c} />
                <div className="flex items-center justify-between pt-1">
                  <span className="num text-[11px] text-muted">{Math.round(cov * 100)}% coverage</span>
                  <button
                    className="text-[11px] font-semibold text-muted hover:text-red-500"
                    onClick={() => void deleteWithUndo(examsRepo, e.id, "exam")}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </BentoCard>
  );

  const coverage = (
    <BentoCard
      title="Coverage checklists"
      subtitle="Linked to syllabus topics"
      className="gap-2.5 h-full"
    >
      <ScrollArea className="flex-1 min-h-0 pr-1">
        <div className="space-y-3 pb-2">
          {sorted.length === 0 && <Empty title="Nothing to cover yet" />}
          {sorted.map((e) => (
            <section key={e.id} className="tile p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="font-bold text-sm truncate">{e.title}</h3>
                {tracks.length > 0 && (
                  <button
                    className="chip !min-h-7 text-[11px]"
                    onClick={() =>
                      patch(e, [
                        ...e.checklist,
                        ...tracks[0].subjects
                          .flatMap((s) => s.units.flatMap((u) => u.topics))
                          .filter((t) => !e.checklist.some((c) => c.text === t.name))
                          .map((t) => ({ id: uid(), text: t.name, done: t.status === "mastered" })),
                      ])
                    }
                  >
                    Import tracker topics
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                {e.checklist.map((c) => (
                  <label key={c.id} className="flex min-h-8 items-center gap-2.5 text-xs cursor-pointer">
                    <Checkbox
                      checked={c.done}
                      onCheckedChange={(checked) =>
                        patch(
                          e,
                          e.checklist.map((x) => (x.id === c.id ? { ...x, done: Boolean(checked) } : x))
                        )
                      }
                    />
                    <span className={c.done ? "line-through opacity-60" : ""}>{c.text}</span>
                  </label>
                ))}
              </div>
              <form
                className="mt-2"
                onSubmit={(ev) => {
                  ev.preventDefault();
                  const f = new FormData(ev.currentTarget).get("t");
                  if (typeof f === "string" && f.trim()) {
                    patch(e, [...e.checklist, { id: uid(), text: f.trim(), done: false }]);
                    ev.currentTarget.reset();
                  }
                }}
              >
                <Field label="">
                  <input name="t" className="input !min-h-8 text-xs" placeholder="Add a topic to cover..." />
                </Field>
              </form>
            </section>
          ))}
        </div>
      </ScrollArea>
    </BentoCard>
  );

  return (
    <PageFrame title="Exams" subtitle="Countdowns, coverage and a timed mock simulator.">
      <Panels
        className="lg:grid-cols-12"
        panels={[
          { id: "r", label: "Radar", className: "lg:col-span-7 sm:col-span-2", node: radarCard },
          { id: "c", label: "Coverage", className: "lg:col-span-5 sm:col-span-2", node: coverage },
        ]}
      />
      {mock && <Mock onClose={() => setMock(false)} />}
    </PageFrame>
  );
}
