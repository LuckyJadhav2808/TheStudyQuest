"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { CloudSlash, PaperPlaneTilt } from "@phosphor-icons/react";
import { Panels } from "@/components/shell/Panels";
import { Card, CardTitle, PageFrame, ProgressBar } from "@/components/ui/misc";
import { db } from "@/core/db";
import { firebaseConfigured } from "@/core/firebase";
import { chatRepo } from "@/core/repos";
import { useSettings } from "@/core/settings";
import { todayKey } from "@/lib/utils";

const MEMBERS = [{ n: "Ada", on: true }, { n: "Linus", on: true }, { n: "Grace", on: false }];
export function GroupsPage() {
  const s = useSettings();
  const code = useMemo(() => { let h = 7; for (const c of s.avatarSeed + s.name) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h.toString(36).toUpperCase().padStart(6, "X").slice(0, 6); }, [s.avatarSeed, s.name]);
  const thread = useLiveQuery(() => db.chatThreads.where("id").equals("guild-demo").first(), [], undefined);
  const logs = useLiveQuery(() => db.studyLogs.toArray(), [], []);
  const tasks = useLiveQuery(() => db.tasks.toArray(), [], []);
  const hab = useLiveQuery(() => db.habitLogs.toArray(), [], []);
  const [msg, setMsg] = useState("");
  const today = todayKey();
  const focus = logs.filter((l) => l.date === today).reduce((a, l) => a + l.minutes, 0);
  const done = tasks.filter((t) => t.completedAt && todayKey(new Date(t.completedAt)) === today).length;
  const quests = [{ t: "Guild focus: 60 minutes today", p: focus / 60 }, { t: "Clear 3 quests today", p: done / 3 }, { t: "Check in a habit", p: hab.filter((h) => h.date === today).length }];
  async function send() {
    if (!msg.trim()) return;
    const m = { role: "user" as const, content: `${s.name}: ${msg.trim()}`, at: Date.now() };
    if (thread) await chatRepo.update(thread.id, { messages: [...thread.messages, m] }); else await chatRepo.add({ id: "guild-demo", title: "Guild chat", persona: "guild", messages: [m] });
    setMsg("");
  }
  const left = (
    <div className="flex min-h-0 flex-col gap-4 [&>*]:min-h-0">
      {!firebaseConfigured && <Card className="gap-2 border-dashed"><CloudSlash size={32} weight="duotone" /><h2 className="card-title">Cloud features need Firebase keys</h2><p className="text-sm text-muted">Shared guilds with live presence need Firebase. Add the NEXT_PUBLIC_FIREBASE_* variables and redeploy. Until then, enjoy the local demo guild.</p></Card>}
      <Card className="gap-2"><CardTitle sub="Local demo guild">Midnight Scholars</CardTitle><p className="text-sm">Invite code <span className="font-display num rounded-full bg-lime px-3 py-1 text-ink">{code}</span></p>
        <div className="scroll-thin min-h-0 flex-1 space-y-1">{[{ n: s.name + " (you)", on: true }, ...MEMBERS].map((m) => <div key={m.n} className="tile flex items-center gap-2 !py-2 text-sm font-bold"><span className={`size-2.5 rounded-full ${m.on ? "bg-teal" : "bg-muted"}`} aria-label={m.on ? "online" : "offline"} />{m.n}</div>)}</div></Card>
    </div>
  );
  const quest = (
    <Card className="gap-3"><CardTitle sub="Progress comes from your real activity">Shared quests</CardTitle>
      {quests.map((q) => <div key={q.t} className="tile"><p className="mb-1 text-sm font-bold">{q.t}</p><ProgressBar pct={Math.min(1, q.p)} /></div>)}</Card>
  );
  const chat = (
    <Card className="gap-2"><CardTitle sub="Stored locally in demo mode">Guild chat</CardTitle>
      <div className="scroll-thin min-h-0 flex-1 space-y-2">{(thread?.messages ?? []).map((m, i) => <p key={i} className="tile !py-2 text-sm">{m.content}</p>)}{!thread && <p className="text-sm text-muted">Say hi to your guild.</p>}</div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(); }}><input className="input" aria-label="Guild message" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Message" /><button className="btn btn-lime btn-icon shrink-0" aria-label="Send"><PaperPlaneTilt size={20} weight="fill" /></button></form></Card>
  );
  return (
    <PageFrame title="Guilds" subtitle="Study together. Presence, chat and shared quests.">
      <Panels className="lg:grid-cols-12" panels={[{ id: "g", label: "Guild", className: "lg:col-span-4", node: left }, { id: "q", label: "Quests", className: "lg:col-span-4", node: quest }, { id: "c", label: "Chat", className: "lg:col-span-4", node: chat }]} />
    </PageFrame>
  );
}
