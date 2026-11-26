"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Panels } from "@/components/shell/Panels";
import { BentoCard } from "@/components/shell/BentoCard";
import { HeroCard } from "@/components/ui/design-primitives";
import { PageFrame, Segmented } from "@/components/ui/misc";
import { db } from "@/core/db";
import { emit } from "@/core/events";
import { scoresRepo } from "@/core/repos";
import { ML_TIERS } from "@/content/ml";
import { MarkdownView } from "@/lib/MarkdownView";
import { RunnableLesson } from "./RunnableLesson";

type View = "lesson" | "formulas" | "quiz";
export function MlPage() {
  const [tier, setTier] = useState(1);
  const [lesson, setLesson] = useState(0);
  const [view, setView] = useState<View>("lesson");
  const [q, setQ] = useState("");
  const [ans, setAns] = useState<number[]>([]);
  const passed = useLiveQuery(() => db.scores.where("game").startsWith("ml-tier-").toArray(), [], []);
  const t = ML_TIERS[tier - 1];
  const hits = useMemo(() => (q.trim().length < 2 ? [] : ML_TIERS.flatMap((x) => x.lessons.map((l, i) => ({ x, l, i }))).filter(({ l }) => (l.title + l.md).toLowerCase().includes(q.toLowerCase())).slice(0, 8)), [q]);
  const score = t.quiz.filter((x, i) => ans[i] === x.answer).length;
  const submit = async () => { const key = `ml-tier-${t.n}`; const done = passed.some((p) => p.game === key); await scoresRepo.add({ game: key, score }); if (score >= 2 && !done) emit("quiz.passed", { xp: 40, label: `Tier ${t.n}` }); setAns((a) => [...a, -1].slice(0, t.quiz.length)); };
  const nav = (
    <BentoCard title="Curriculum" subtitle="Seven tiers, beginner to modern" className="h-full surface-inverse" bodyClassName="gap-2">
      <div className="relative"><MagnifyingGlass size={16} className="absolute left-4 top-3.5 text-muted" /><input className="input !pl-10" placeholder="Spotlight search" aria-label="Search lessons" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="scroll-thin min-h-0 flex-1 space-y-2">
        {hits.map(({ x, l, i }) => <button key={l.id} className="tile w-full text-left text-sm font-bold" onClick={() => { setTier(x.n); setLesson(i); setView("lesson"); setQ(""); }}>{l.title}<span className="block text-xs font-normal text-muted">Tier {x.n}: {x.name}</span></button>)}
        {!hits.length && ML_TIERS.map((x) => { const done = passed.some((p) => p.game === `ml-tier-${x.n}` && p.score >= 2); return (
          <button key={x.n} onClick={() => { setTier(x.n); setLesson(0); setView("lesson"); setAns([]); }} className={`relative tile w-full border-[1.5px] text-left transition ${x.n === tier ? "border-border-strong text-on-primary" : "border-transparent"}`}>
            {x.n === tier && <motion.span layoutId="active-ml-tier" transition={{ type: "spring", stiffness: 500, damping: 32 }} className="absolute inset-0 rounded-[24px] bg-primary -z-0" />}
            <span className="relative z-10 block">
              <span className="num block text-xs font-bold opacity-75">TIER {x.n}{done ? " · passed" : ""}</span>
              <span className="block font-bold">{x.name}</span>
              <span className="block text-xs opacity-75">{x.blurb}</span>
            </span>
          </button>
        ); })}
      </div>
    </BentoCard>
  );
  const reader = (
    <HeroCard
      tint="notes"
      hardShadow
      title={`Tier ${t.n}: ${t.name}`}
      action={<Segmented<View> value={view} onChange={setView} options={[{ value: "lesson", label: "Lesson" }, { value: "formulas", label: "Formulas" }, { value: "quiz", label: "Quiz" }]} />}
      className="h-full"
    >
      <div className="scroll-thin min-h-0 flex-1">
        {view === "lesson" && <>
          <div className="mb-2 flex flex-wrap gap-2">{t.lessons.map((l, i) => <button key={l.id} className={`chip ${i === lesson ? "bg-surface-inverse text-on-inverse" : ""}`} onClick={() => setLesson(i)}>{l.title}</button>)}</div>
          <h3 className="font-display text-2xl">{t.lessons[lesson].title}</h3>
          <RunnableLesson key={t.lessons[lesson].id} md={t.lessons[lesson].md} />
        </>}
        {view === "formulas" && <MarkdownView source={t.formulas} />}
        {view === "quiz" && (
          <div className="space-y-4">
            {t.quiz.map((x, i) => (
              <div key={x.q} className="tile bg-surface/90"><p className="font-bold">{i + 1}. {x.q}</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{x.options.map((o, k) => <button key={o} aria-pressed={ans[i] === k} onClick={() => setAns((a) => { const n = [...a]; n[i] = k; return n; })} className={`min-h-11 rounded-full border-[1.5px] border-border-strong px-4 text-left text-sm font-semibold ${ans[i] === k ? "bg-primary text-on-primary" : "bg-surface"}`}>{o}</button>)}</div></div>
            ))}
            <button className="btn btn-lime" disabled={t.quiz.some((_, i) => ans[i] === undefined || ans[i] < 0)} onClick={() => void submit()}>Check answers</button>
            {ans.length === t.quiz.length && ans.every((a) => a >= 0) && <p className="font-display text-xl" role="status">{score}/{t.quiz.length}. {score >= 2 ? "Passed. XP awarded once per tier." : "Review the lesson and retry."}</p>}
          </div>
        )}
      </div>
    </HeroCard>
  );
  return (
    <PageFrame title="ML Path" subtitle="Seven tiers with runnable Python and formula sheets.">
      <Panels className="lg:grid-cols-12" panels={[{ id: "nav", label: "Tiers", className: "lg:col-span-4", node: nav }, { id: "lesson", label: "Lesson", className: "lg:col-span-8", node: reader }]} />
    </PageFrame>
  );
}
