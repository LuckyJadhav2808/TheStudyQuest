"use client";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useLiveQuery } from "dexie-react-hooks";
import { startOfWeek, subWeeks, format } from "date-fns";
import { useMemo, useRef, useState } from "react";
import { Drawer } from "vaul";
import { ArrowSquareOut, CheckCircle, Circle, ArrowsClockwise, Robot } from "@phosphor-icons/react";
import { Panels } from "@/components/shell/Panels";
import { BentoCard } from "@/components/shell/BentoCard";
import { EmptyState, HeroCard } from "@/components/ui/design-primitives";
import { Badge, CountUp, PageFrame, ProgressBar, Segmented } from "@/components/ui/misc";
import { Select } from "@/components/ui/fields";
import { db } from "@/core/db";
import { emit } from "@/core/events";
import { dsaRepo } from "@/core/repos";
import type { DsaProblem } from "@/core/types";
import { SHEETS, TOPIC_ORDER, type SheetProblem } from "@/content/dsa";
import { useSettings, updateSettings } from "@/core/settings";
import { streamAI } from "@/lib/aiClient";
import { MarkdownView } from "@/lib/MarkdownView";
import { strobiSay } from "@/features/strobi/toast";

const DIFF_COLOR = { easy: "var(--success)", medium: "var(--warning)", hard: "var(--danger)" };
type Status = DsaProblem["status"];

export function DsaPage() {
  const rows = useLiveQuery(() => db.dsaProblems.toArray(), [], []);
  const s = useSettings();
  const [sheetId, setSheetId] = useState("blind75");
  const [diff, setDiff] = useState("all");
  const [topic, setTopic] = useState("all");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [side, setSide] = useState<"roadmap" | "stats">("roadmap");
  const [open, setOpen] = useState<SheetProblem | null>(null);
  const [ai, setAi] = useState({ out: "", busy: false });
  const [code, setCode] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const sheet = SHEETS.find((x) => x.id === sheetId) ?? SHEETS[0];
  const byKey = useMemo(() => new Map(rows.map((r) => [r.key, r])), [rows]);
  const st = (p: SheetProblem): Status => byKey.get(p.key)?.status ?? "todo";
  const topics = [...new Set(sheet.problems.map((p) => p.topic))];
  const filtered = sheet.problems.filter((p) => (diff === "all" || p.difficulty === diff) && (topic === "all" || p.topic === topic) && (status === "all" || st(p) === status) && p.title.toLowerCase().includes(q.toLowerCase()));
  const virt = useVirtualizer({ count: filtered.length, getScrollElement: () => list.current, estimateSize: () => 56, overscan: 8 });
  const solved = sheet.problems.filter((p) => st(p) === "solved").length;

  async function setStatusOf(p: SheetProblem, next: Status) {
    const ex = byKey.get(p.key);
    if (ex) await dsaRepo.update(ex.id, { status: next, solvedAt: next === "solved" ? ex.solvedAt ?? Date.now() : ex.solvedAt });
    else await dsaRepo.add({ key: p.key, title: p.title, sheet: p.sheet, topic: p.topic, difficulty: p.difficulty, url: p.url, status: next, notes: "", solvedAt: next === "solved" ? Date.now() : undefined });
    if (next === "solved" && !ex?.solvedAt) emit("dsa.solved", { difficulty: p.difficulty, title: p.title });
  }
  const cycle = (p: SheetProblem) => void setStatusOf(p, st(p) === "todo" ? "solved" : st(p) === "solved" ? "review" : "todo");
  async function ask(kind: "hint" | "complexity") {
    if (!open) return;
    setAi({ out: "", busy: true });
    const msg = kind === "hint" ? `Give me a Socratic hint (a guiding question only, no solution) for the problem "${open.title}" (${open.topic}).` : `Analyse the time and space complexity of this solution to "${open.title}":\n\`\`\`\n${code}\n\`\`\``;
    try { await streamAI([{ role: "user", content: msg }], { system: "You are a Socratic DSA coach. Be brief. Markdown.", onChunk: (t) => setAi({ out: t, busy: true }) }); setAi((a) => ({ ...a, busy: false })); } catch (e) { setAi({ out: "", busy: false }); strobiSay(e instanceof Error ? e.message : "AI failed", "error"); }
  }
  async function sync() {
    if (!s.leetcodeUser) return;
    try { const r = await fetch(`/api/leetcode?user=${encodeURIComponent(s.leetcodeUser)}`); const j = (await r.json()) as { solved?: Record<string, number>; error?: string }; if (j.solved) strobiSay(`LeetCode: ${j.solved.all ?? 0} solved (${j.solved.easy ?? 0}E / ${j.solved.medium ?? 0}M / ${j.solved.hard ?? 0}H)`, "tip"); else strobiSay("Could not reach that LeetCode profile right now.", "error"); } catch { strobiSay("LeetCode sync failed. Try again later.", "error"); }
  }
  const mastery = TOPIC_ORDER.filter((t) => topics.includes(t)).map((t) => { const ps = sheet.problems.filter((p) => p.topic === t); return { t, done: ps.filter((p) => st(p) === "solved").length, n: ps.length }; });
  const weekly = Array.from({ length: 6 }, (_, i) => { const a = startOfWeek(subWeeks(new Date(), 5 - i), { weekStartsOn: 1 }).getTime(); return { w: format(a, "d MMM"), n: rows.filter((r) => r.solvedAt && r.solvedAt >= a && r.solvedAt < a + 7 * 864e5).length }; });
  const maxW = Math.max(1, ...weekly.map((x) => x.n));
  const current = open ? byKey.get(open.key) : undefined;

  const main = (
    <HeroCard tint="notes" hardShadow className="h-full" bodyClassName="gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={sheetId} onChange={setSheetId} options={SHEETS.map((x) => ({ value: x.id, label: x.label }))} className="max-w-full overflow-x-auto no-scrollbar" />
        <span className="num ml-auto text-sm font-bold"><CountUp value={solved} />/{sheet.problems.length}</span>
      </div>
      <ProgressBar pct={solved / sheet.problems.length} />
      <div className="flex flex-wrap gap-2">
        <input className="input min-w-32 flex-1" placeholder="Search problems" aria-label="Search problems" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select className="max-w-32" value={diff} onChange={setDiff} options={[{ value: "all", label: "Any difficulty" }, { value: "easy", label: "Easy" }, { value: "medium", label: "Medium" }, { value: "hard", label: "Hard" }]} />
        <Select className="max-w-36" value={topic} onChange={setTopic} options={[{ value: "all", label: "All topics" }, ...topics.map((t) => ({ value: t, label: t }))]} />
        <Select className="max-w-32" value={status} onChange={setStatus} options={[{ value: "all", label: "Any status" }, { value: "todo", label: "To do" }, { value: "solved", label: "Solved" }, { value: "review", label: "Review" }]} />
      </div>
      <div ref={list} className="scroll-thin min-h-0 flex-1">
        {filtered.length === 0 ? <EmptyState title="No problems match" hint="Loosen a filter to see more." mood="thinking" /> : (
          <div style={{ height: virt.getTotalSize(), position: "relative" }}>
            {virt.getVirtualItems().map((v) => { const p = filtered[v.index]; const x = st(p); return (
              <div key={p.key} style={{ position: "absolute", top: 0, width: "100%", height: v.size, transform: `translateY(${v.start}px)` }} className="pb-1.5">
                <div className="tile bg-surface/90 flex h-full items-center gap-3 !py-1.5">
                  <button aria-label={`Status ${x}. Click to change`} onClick={() => cycle(p)}>{x === "solved" ? <CheckCircle size={26} weight="fill" className="text-teal" /> : x === "review" ? <ArrowsClockwise size={26} weight="bold" className="text-orange" /> : <Circle size={26} />}</button>
                  <button className="min-w-0 flex-1 text-left" onClick={() => { setOpen(p); setAi({ out: "", busy: false }); setCode(""); }}><p className="truncate text-sm font-bold">{p.title}</p><p className="truncate text-xs text-muted">{p.topic}</p></button>
                  <Badge color={DIFF_COLOR[p.difficulty]}>{p.difficulty}</Badge>
                </div>
              </div>
            ); })}
          </div>
        )}
      </div>
    </HeroCard>
  );
  const insight = (
    <BentoCard
      title="Insights"
      action={<Segmented value={side} onChange={setSide} options={[{ value: "roadmap", label: "Roadmap" }, { value: "stats", label: "Stats" }]} />}
      className="h-full surface-inverse"
    >
      <div className="scroll-thin min-h-0 flex-1">
        {side === "roadmap" ? (
          <ol className="relative ml-3 space-y-3 border-l-2 border-dashed border-line pl-5" aria-label="Topic roadmap">
            {mastery.map((m) => (
              <li key={m.t} className="relative"><span className="absolute -left-[31px] top-2 size-4 rounded-full border-[1.5px] border-border-strong" style={{ background: m.done === m.n ? "var(--primary)" : "var(--surface)" }} />
                <button className="tile w-full text-left" onClick={() => setTopic(m.t)}><div className="flex justify-between text-sm font-bold"><span>{m.t}</span><span className="num">{m.done}/{m.n}</span></div><ProgressBar pct={m.done / m.n} className="mt-1.5 !h-2" /></button></li>
            ))}
          </ol>
        ) : (
          <div className="space-y-4">
            <div><p className="mb-2 text-sm font-bold">Weekly solves</p><div className="flex h-28 items-end gap-2">{weekly.map((w) => <div key={w.w} className="flex flex-1 flex-col items-center gap-1"><div className="w-full rounded-xl border-[1.5px] border-border-strong bg-primary" style={{ height: `${(w.n / maxW) * 100}%`, minHeight: 4 }} /><span className="text-[10px] text-muted">{w.w}</span><span className="num text-xs font-bold">{w.n}</span></div>)}</div></div>
            <div><p className="mb-2 text-sm font-bold">LeetCode sync</p><div className="flex gap-2"><input className="input" placeholder="LeetCode username" aria-label="LeetCode username" defaultValue={s.leetcodeUser} onBlur={(e) => void updateSettings({ leetcodeUser: e.target.value.trim() })} /><button className="btn btn-lime" onClick={() => void sync()}>Sync</button></div></div>
          </div>
        )}
      </div>
    </BentoCard>
  );
  return (
    <PageFrame title="DSA Sheets" subtitle="Track the famous lists. Solve to earn XP, coins and crystals.">
      <Panels className="lg:grid-cols-12" panels={[{ id: "list", label: "Problems", className: "lg:col-span-8", node: main }, { id: "ins", label: "Insights", className: "lg:col-span-4", node: insight }]} />
      <Drawer.Root open={open !== null} onOpenChange={(o) => !o && setOpen(null)} direction="right">
        <Drawer.Portal><Drawer.Overlay className="fixed inset-0 z-[60] bg-black/40" />
          <Drawer.Content className="fixed bottom-2 right-2 top-2 z-[61] flex w-[min(96vw,440px)] flex-col gap-3 rounded-[32px] border-[1.5px] border-line bg-surface p-5 text-fg outline-none">
            <Drawer.Title className="font-display text-2xl">{open?.title}</Drawer.Title><Drawer.Description className="sr-only">Problem details</Drawer.Description>
            {open && <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2"><Badge color={DIFF_COLOR[open.difficulty]}>{open.difficulty}</Badge><span className="chip">{open.topic}</span><a className="btn btn-sm btn-ink" href={open.url} target="_blank" rel="noreferrer"><ArrowSquareOut size={14} />Open problem</a></div>
              <Segmented<Status> value={st(open)} onChange={(v) => void setStatusOf(open, v)} options={[{ value: "todo", label: "To do" }, { value: "solved", label: "Solved" }, { value: "review", label: "Review" }]} />
              <textarea className="input !min-h-28" placeholder="Personal notes: approach, pitfalls, patterns" aria-label="Personal notes" defaultValue={current?.notes} key={open.key + (current?.id ?? "")} onBlur={(e) => { if (current) void dsaRepo.update(current.id, { notes: e.target.value }); else void setStatusOf(open, "todo").then(async () => { const r = await db.dsaProblems.where("key").equals(open.key).first(); if (r) await dsaRepo.update(r.id, { notes: e.target.value }); }); }} />
              <div className="flex gap-2"><button className="btn btn-sm" disabled={ai.busy} onClick={() => void ask("hint")}><Robot size={14} />Socratic hint</button></div>
              <textarea className="input !min-h-20 font-mono text-xs" placeholder="Paste your solution for a complexity analysis" aria-label="Solution code" value={code} onChange={(e) => setCode(e.target.value)} />
              <button className="btn btn-sm self-start" disabled={ai.busy || !code.trim()} onClick={() => void ask("complexity")}>Analyse complexity</button>
              {(ai.out || ai.busy) && <div className="rounded-[20px] bg-soft p-3">{ai.out ? <MarkdownView source={ai.out} className="!text-sm" /> : "Thinking..."}</div>}
            </div>}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </PageFrame>
  );
}
