"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { eachDayOfInterval, format, startOfWeek, subDays, subWeeks } from "date-fns";
import { useMemo } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { DownloadSimple, Printer } from "@phosphor-icons/react";
import { Panels } from "@/components/shell/Panels";
import { Card, CardTitle, Empty, PageFrame, TickGauge } from "@/components/ui/misc";
import { db } from "@/core/db";
import { useGame, useSettings } from "@/core/settings";
import { downloadBlob, todayKey } from "@/lib/utils";

const PALETTE = [
  "var(--viz-1)",
  "var(--viz-2)",
  "var(--viz-3)",
  "var(--viz-4)",
  "var(--viz-5)",
  "var(--viz-6)",
  "var(--viz-7)",
];
export function AnalyticsPage() {
  const logs = useLiveQuery(() => db.studyLogs.toArray(), [], []);
  const s = useSettings();
  const g = useGame();
  const live = logs.filter((l) => !l.deletedAt);
  const d = useMemo(() => {
    const byDay = new Map<string, number>();
    live.forEach((l) => byDay.set(l.date, (byDay.get(l.date) ?? 0) + l.minutes));
    const days = eachDayOfInterval({ start: subDays(new Date(), 364), end: new Date() });
    const subj = new Map<string, number>();
    live.forEach((l) => subj.set(l.subject, (subj.get(l.subject) ?? 0) + l.minutes));
    const weeks = Array.from({ length: 8 }, (_, i) => { const st = startOfWeek(subWeeks(new Date(), 7 - i), { weekStartsOn: 1 }); let m = 0; for (let k = 0; k < 7; k++) m += byDay.get(todayKey(new Date(st.getTime() + k * 86400000))) ?? 0; return { w: format(st, "d MMM"), min: m }; });
    return { byDay, days, subjects: [...subj.entries()].map(([name, min]) => ({ name, min })).sort((a, b) => b.min - a.min).slice(0, 7), weeks };
  }, [live]);
  const level = (m: number) => (m === 0 ? "var(--surface-2)" : m < 30 ? "var(--color-lime-100)" : m < 90 ? "var(--primary)" : m < 180 ? "var(--color-lime-600)" : "var(--color-lime-800)");
  const total = live.reduce((a, l) => a + l.minutes, 0);
  const csv = () => downloadBlob("studyquest-report.csv", "date,minutes,subject,slot\n" + live.map((l) => `${l.date},${l.minutes},"${l.subject}",${l.slot}`).join("\n"), "text/csv");
  const txt = () => downloadBlob("studyquest-report.txt", `StudyQuest report\nTotal focus: ${(total / 60).toFixed(1)}h\nLevel ${g.level}, ${g.xp} XP\nStreak ${g.streak} (best ${g.bestStreak})\n\n` + d.subjects.map((x) => `${x.name}: ${x.min} min`).join("\n"));
  const tip = { borderRadius: 16, border: "1.5px solid var(--border-strong)", background: "var(--surface)", color: "var(--ink)" };
  const heat = (
    <Card className="gap-3 bg-[var(--domain-stats-tint)]">
      <CardTitle sub={`${(total / 60).toFixed(1)} focus hours in total`} right={<div className="flex gap-2 no-print"><button className="btn btn-sm" onClick={csv}><DownloadSimple size={16} />CSV</button><button className="btn btn-sm" onClick={txt}>TXT</button><button className="btn btn-sm btn-ink" onClick={() => window.print()}><Printer size={16} />PDF</button></div>}>Past year</CardTitle>
      <div className="scroll-thin min-h-0 flex-1 overflow-x-auto">
        {live.length === 0 ? <Empty title="No study data yet" hint="Finish a focus block and your heatmap starts filling in." /> : (
          <div className="grid grid-flow-col grid-rows-7 gap-[3px]" style={{ width: "max-content" }} aria-label="365 day heatmap">
            {Array.from({ length: (d.days[0].getDay() + 6) % 7 }, (_, i) => <span key={`p${i}`} className="size-3.5" />)}
            {d.days.map((day) => { const k = todayKey(day); const m = d.byDay.get(k) ?? 0; return <span key={k} title={`${k}: ${m} min`} className="size-3.5 rounded-[4px] border border-line/40" style={{ background: level(m) }} />; })}
          </div>
        )}
      </div>
    </Card>
  );
  const split = (
    <Card className="gap-2">
      <CardTitle>Focus by subject</CardTitle>
      {d.subjects.length === 0 ? <Empty title="Nothing to split yet" /> : (
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-2">
          <ResponsiveContainer width="100%" height="100%" minHeight={100}><RadarChart data={d.subjects}><PolarGrid stroke="var(--line)" /><PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--fg)" }} /><Radar dataKey="min" stroke="var(--viz-1)" fill="var(--viz-1)" fillOpacity={0.4} /></RadarChart></ResponsiveContainer>
          <ResponsiveContainer width="100%" height="100%" minHeight={100}><PieChart><Pie data={d.subjects} dataKey="min" nameKey="name" innerRadius="50%" outerRadius="85%" stroke="var(--border-strong)">{d.subjects.map((x, i) => <Cell key={x.name} fill={PALETTE[i % PALETTE.length]} />)}</Pie><Tooltip contentStyle={tip} /></PieChart></ResponsiveContainer>
        </div>
      )}
    </Card>
  );
  const thisWeekMin = d.weeks[d.weeks.length - 1]?.min ?? 0;
  const weeklyGoal = s.focusGoalMin * 7;
  const weekly = (
    <Card className="gap-2 surface-inverse">
      <CardTitle
        sub={`Goal ${weeklyGoal} min a week`}
        right={<TickGauge pct={weeklyGoal > 0 ? thisWeekMin / weeklyGoal : 0} label="Goal" className="w-16" />}
      >
        Weekly velocity
      </CardTitle>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%" minHeight={100}>
          <BarChart data={d.weeks}>
            <defs>
              <pattern id="sq-an-hatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <rect width="6" height="6" fill="var(--viz-2)" />
                <line x1="0" y1="0" x2="0" y2="6" stroke="var(--on-primary)" strokeWidth="2.5" strokeOpacity="0.32" />
              </pattern>
            </defs>
            <XAxis dataKey="w" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted)" }} />
            <Tooltip cursor={false} contentStyle={tip} formatter={(v) => [`${v} min`, "Focus"]} />
            <ReferenceLine y={weeklyGoal} stroke="var(--viz-3)" strokeDasharray="4 4" />
            <Bar dataKey="min" stroke="var(--on-inverse)" strokeWidth={1.5} radius={[10, 10, 10, 10]}>
              {d.weeks.map((_, idx) => (
                <Cell key={idx} fill={idx === d.weeks.length - 1 ? "url(#sq-an-hatch)" : "var(--viz-2)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
  return (
    <PageFrame title="Analytics" subtitle="Where your hours actually go.">
      <Panels className="sm:grid-cols-2 lg:grid-cols-12 lg:grid-rows-2" panels={[{ id: "h", label: "Heatmap", className: "sm:col-span-2 lg:col-span-12", node: heat }, { id: "s", label: "Subjects", className: "lg:col-span-7", node: split }, { id: "w", label: "Weekly", className: "lg:col-span-5", node: weekly }]} />
    </PageFrame>
  );
}
