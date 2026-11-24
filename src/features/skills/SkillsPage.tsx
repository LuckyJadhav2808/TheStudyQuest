"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { Panels } from "@/components/shell/Panels";
import { Card, CardTitle, PageFrame } from "@/components/ui/misc";
import { db } from "@/core/db";
import { gameRepo, skillsRepo } from "@/core/repos";
import { useGame } from "@/core/settings";
import { SKILLS, type Branch, type SkillDef } from "@/content/skills";
import { strobiSay } from "@/features/strobi/toast";

const BRANCH_X: Record<Branch, number> = { Focus: 15, Combat: 50, Beast: 85 };
export function SkillsPage() {
  const g = useGame();
  const owned = useLiveQuery(() => db.skills.toArray(), [], []);
  const [sel, setSel] = useState<SkillDef>(SKILLS[0]);
  const has = (id: string) => owned.some((o) => o.id === id);
  const avail = (s: SkillDef) => !has(s.id) && s.requires.every(has) && g.skillPoints >= s.cost;
  const unlock = async (s: SkillDef) => {
    if (!avail(s)) return strobiSay(has(s.id) ? "Already unlocked." : "Needs a prerequisite or more skill points.", "tip");
    await skillsRepo.unlock(s.id);
    await gameRepo.mutate((x) => ({ ...x, skillPoints: x.skillPoints - s.cost }));
    strobiSay(`${s.name} unlocked. ${s.desc}.`, "levelup");
  };
  const tree = (
    <Card className="gap-2">
      <CardTitle sub="Earn a point every level. Passives apply automatically." right={<span className="chip bg-lime text-ink num">{g.skillPoints} points</span>}>Skill tree</CardTitle>
      <div className="min-h-0 flex-1">
        <svg viewBox="0 0 100 100" className="size-full" role="group" aria-label="Skill tree" preserveAspectRatio="xMidYMid meet">
          {(Object.keys(BRANCH_X) as Branch[]).map((b) => <text key={b} x={BRANCH_X[b]} y={5} textAnchor="middle" fontSize="4" fontWeight="800" fill="var(--fg)" fontFamily="var(--font-display)">{b}</text>)}
          {SKILLS.flatMap((s) => s.requires.map((r) => { const p = SKILLS.find((x) => x.id === r); return p ? <line key={s.id + r} x1={p.x} y1={p.y} x2={s.x} y2={s.y} stroke={has(r) && has(s.id) ? "#7C5CFF" : "var(--muted)"} strokeWidth="1" strokeDasharray={has(r) ? "0" : "2 2"} /> : null; }))}
          {SKILLS.map((s) => (
            <g key={s.id} tabIndex={0} role="button" aria-label={`${s.name}. ${has(s.id) ? "Unlocked" : avail(s) ? "Available" : "Locked"}`} onClick={() => setSel(s)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSel(s); }} style={{ cursor: "pointer" }}>
              <circle cx={s.x} cy={s.y} r={sel.id === s.id ? 7.5 : 6.5} fill={has(s.id) ? "#D9FF45" : avail(s) ? "var(--surface)" : "var(--soft)"} stroke={avail(s) ? "#7C5CFF" : "var(--fg)"} strokeWidth={avail(s) ? 1.6 : 0.8} />
              <text x={s.x} y={s.y + 1.4} textAnchor="middle" fontSize="4" fontWeight="800" fill={has(s.id) ? "#0b0b0c" : "var(--fg)"}>{s.cost}</text>
              <text x={s.x} y={s.y + 11.5} textAnchor="middle" fontSize="3" fill="var(--fg)">{s.name}</text>
            </g>
          ))}
        </svg>
      </div>
    </Card>
  );
  const detail = (
    <Card className="gap-3">
      <CardTitle sub={`${sel.branch} branch`}>{sel.name}</CardTitle>
      <p>{sel.desc}</p>
      <p className="text-sm text-muted">Cost: {sel.cost} point{sel.cost > 1 ? "s" : ""}. {sel.requires.length ? `Requires ${sel.requires.map((r) => SKILLS.find((x) => x.id === r)?.name).join(", ")}.` : "No prerequisites."}</p>
      <button className="btn btn-lime self-start" disabled={!avail(sel)} onClick={() => void unlock(sel)}>{has(sel.id) ? "Unlocked" : "Unlock"}</button>
    </Card>
  );
  return (
    <PageFrame title="Skills" subtitle="Three branches of passive power.">
      <Panels className="lg:grid-cols-12" panels={[{ id: "t", label: "Tree", className: "lg:col-span-8", node: tree }, { id: "d", label: "Details", className: "lg:col-span-4", node: detail }]} />
    </PageFrame>
  );
}
