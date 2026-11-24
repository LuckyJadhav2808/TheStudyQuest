"use client";
import { useEffect, useState } from "react";
import { Card, CardTitle, PageFrame } from "@/components/ui/misc";
import { db } from "@/core/db";
import { resourcesRepo } from "@/core/repos";
import { SHEETS } from "@/content/dsa";
import { Panels } from "@/components/shell/Panels";
import { aiUsage } from "@/lib/aiClient";
import { useRows } from "@/features/shared/hooks";
import { strobiSay } from "@/features/strobi/toast";

interface Info { adminConfigured: boolean; keys: Record<string, boolean>; firebase: boolean }
export function AdminPage() {
  const [info, setInfo] = useState<Info | null>(null);
  const [text, setText] = useState("");
  const bugs = (useRows(resourcesRepo) ?? []).filter((r) => r.folder === "Bug reports");
  useEffect(() => { void fetch("/api/admin/info").then((r) => r.json() as Promise<Info>).then(setInfo).catch(() => setInfo(null)); }, []);
  const u = aiUsage();
  const resync = async () => { const keys = new Set(SHEETS.flatMap((s) => s.problems.map((p) => p.key))); const rows = await db.dsaProblems.toArray(); const stale = rows.filter((r) => !keys.has(r.key)); await db.dsaProblems.bulkDelete(stale.map((r) => r.id)); strobiSay(`DSA cache synced. Removed ${stale.length} stale rows.`, "tip"); };
  return (
    <PageFrame title="Admin" subtitle="Local telemetry and maintenance. Enable via the admin feature flag.">
      <Panels className="lg:grid-cols-3" panels={[
        { id: "t", label: "Telemetry", node: <Card className="gap-2"><CardTitle>AI usage (this device)</CardTitle><p className="font-display num text-5xl">{u.calls}</p><p className="text-sm text-muted">calls, {u.chars.toLocaleString()} characters streamed.</p>{info && <ul className="text-sm"><li>Admin emails configured: {String(info.adminConfigured)}</li>{Object.entries(info.keys).map(([k, v]) => <li key={k}>{k} key: {v ? "set" : "missing"}</li>)}<li>Firebase: {info.firebase ? "configured" : "off"}</li></ul>}</Card> },
        { id: "d", label: "Datasets", node: <Card className="gap-2"><CardTitle>DSA datasets</CardTitle>{SHEETS.map((s) => <p key={s.id} className="tile !py-2 text-sm"><b>{s.label}</b> · {s.problems.length} problems</p>)}<button className="btn btn-ink self-start" onClick={() => void resync()}>Re-sync cache</button></Card> },
        { id: "b", label: "Bugs", node: <Card className="gap-2"><CardTitle>Bug reports</CardTitle><form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { void resourcesRepo.add({ title: text.trim(), url: "", kind: "text", folder: "Bug reports", color: "#FF5A4A", pinned: false, tags: ["bug"], text: text.trim() }); setText(""); } }}><input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Describe a bug" aria-label="Bug description" /><button className="btn btn-lime shrink-0">Log</button></form><div className="scroll-thin min-h-0 flex-1 space-y-1">{bugs.map((b) => <p key={b.id} className="tile !py-2 text-sm">{b.title}</p>)}{!bugs.length && <p className="text-sm text-muted">No reports logged.</p>}</div></Card> },
      ]} />
    </PageFrame>
  );
}
