"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { FilePlus, Play, Robot, Trash, X, Eye } from "@phosphor-icons/react";
import { useLiveQuery } from "dexie-react-hooks";
import { Panels } from "@/components/shell/Panels";
import { Card, CardTitle, Skeleton } from "@/components/ui/misc";
import { Select } from "@/components/ui/fields";
import { db } from "@/core/db";
import { emit } from "@/core/events";
import { codeFilesRepo } from "@/core/repos";
import type { CodeFile } from "@/core/types";
import { streamAI } from "@/lib/aiClient";
import { MarkdownView } from "@/lib/MarkdownView";
import { runPython, useKernel } from "@/lib/pyodide/kernel";
import { strobiSay } from "@/features/strobi/toast";
import { RUNNABLE_NOTE, jsDoc, langOf, syntaxCheck, toJs, webDoc } from "./runners";
import type { CmTheme } from "./CodeEditor";

const CodeEditor = dynamic(() => import("./CodeEditor"), { ssr: false, loading: () => <Skeleton className="h-full" /> });
type Project = "code" | "ide";
const SEED: Record<Project, [string, string][]> = {
  code: [["index.html", "<main>\n  <h1>Hello, StudyQuest</h1>\n  <button id=\"b\">Click me</button>\n</main>"], ["style.css", "body { font-family: system-ui; padding: 24px; }\nbutton { padding: 8px 16px; border-radius: 99px; }"], ["script.js", "document.getElementById('b').onclick = () => console.log('clicked at', new Date().toLocaleTimeString());\nconsole.log('ready');"], ["main.py", "def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a\n\nprint([fib(i) for i in range(10)])"]],
  ide: [["main.py", "print('Hello from the IDE')"], ["utils.js", "export const add = (a, b) => a + b;\nconsole.log(add(2, 3));"], ["README.md", "# Project\n\nNotes for this workspace."]],
};
const AI_ACTIONS = [["Explain", "Explain what this code does, step by step."], ["Fix", "Find bugs in this code and give a corrected version."], ["Complexity", "Analyse time and space complexity."], ["Generate tests", "Write unit tests for this code."]];

export function CodeWorkspace({ project }: { project: Project }) {
  const files = useLiveQuery(() => db.codeFiles.where("project").equals(project).toArray(), [project], undefined);
  const [open, setOpen] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [theme, setTheme] = useState<CmTheme>("one-dark");
  const [lines, setLines] = useState<{ level: string; text: string }[]>([]);
  const [preview, setPreview] = useState("");
  const [ai, setAi] = useState({ out: "", busy: false });
  const frame = useRef<HTMLIFrameElement>(null);
  const kernel = useKernel();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { if (files && files.length === 0) SEED[project].forEach(([name, content]) => void codeFilesRepo.add({ project, name, content, language: langOf(name) })); }, [files, project]);
  useEffect(() => {
    const h = (e: MessageEvent) => { const d = e.data as { __sq?: number; level: string; text: string } | null; if (d?.__sq && e.source === frame.current?.contentWindow) setLines((l) => [...l.slice(-200), { level: d.level, text: d.text }]); };
    window.addEventListener("message", h);
    return () => window.removeEventListener("message", h);
  }, []);
  useEffect(() => { if (files?.length && !active) { setActive(files[0].id); setOpen([files[0].id]); } }, [files, active]);

  const cur = files?.find((f) => f.id === active);
  const [draft, setDraft] = useState<{ id: string; v: string } | null>(null);
  const value = draft && draft.id === cur?.id ? draft.v : cur?.content ?? "";
  const edit = (v: string) => { if (!cur) return; setDraft({ id: cur.id, v }); clearTimeout(timer.current); timer.current = setTimeout(() => void codeFilesRepo.update(cur.id, { content: v }), 400); };
  const lang = cur ? langOf(cur.name) : "javascript";
  const issue = useMemo(() => (cur && project === "ide" ? syntaxCheck(cur.name, value) : null), [cur, value, project]);

  async function run() {
    if (!cur) return;
    setLines([]);
    emit("code.ran", { lang });
    const all = (files ?? []).map((f) => (f.id === cur.id ? { ...f, content: value } : f));
    try {
      if (lang === "python") {
        const r = await runPython(value);
        setLines([...(r.stdout ? [{ level: "log", text: r.stdout }] : []), ...(r.stderr ? [{ level: "error", text: r.stderr }] : []), ...(r.error ? [{ level: "error", text: r.error }] : []), ...(r.value ? [{ level: "info", text: `=> ${r.value}` }] : [])]);
      } else if (lang === "javascript" || lang === "typescript") setPreview(jsDoc(await toJs(value, cur.name)));
      else if (lang === "html" || lang === "css") setPreview(webDoc(all));
      else setLines([{ level: "warn", text: RUNNABLE_NOTE[lang] ?? "No runner for this file type." }]);
    } catch (e) { setLines([{ level: "error", text: e instanceof Error ? e.message : "Run failed" }]); }
  }
  async function ask(prompt: string) {
    setAi({ out: "", busy: true });
    try { await streamAI([{ role: "user", content: `${prompt}\n\nFile ${cur?.name}:\n\`\`\`${lang}\n${value.slice(0, 8000)}\n\`\`\`` }], { system: "You are a concise coding assistant. Use Markdown.", onChunk: (t) => setAi({ out: t, busy: true }) }); setAi((a) => ({ ...a, busy: false })); }
    catch (e) { setAi({ out: "", busy: false }); strobiSay(e instanceof Error ? e.message : "AI failed", "error"); }
  }
  const addFile = async () => { const name = prompt("File name (with extension)")?.trim(); if (!name) return; const f = await codeFilesRepo.add({ project, name, content: "", language: langOf(name) }); setActive(f.id); setOpen((o) => [...o, f.id]); };
  if (!files) return <Card><Skeleton className="h-full" /></Card>;

  const tree = (
    <Card className="gap-2">
      <CardTitle right={<button className="btn btn-sm btn-icon" aria-label="New file" onClick={() => void addFile()}><FilePlus size={18} /></button>}>{project === "ide" ? "Project" : "Files"}</CardTitle>
      <div className="scroll-thin min-h-0 flex-1 space-y-1">
        {files.map((f) => (
          <div key={f.id} className={`flex items-center rounded-full ${f.id === active ? "bg-lime text-ink" : "hover:bg-soft"}`}>
            <button className="min-h-9 flex-1 truncate px-3 text-left font-mono text-xs font-bold" onClick={() => { setActive(f.id); setOpen((o) => (o.includes(f.id) ? o : [...o, f.id])); }}>{f.name}</button>
            <button aria-label={`Delete ${f.name}`} className="px-2" onClick={() => { void codeFilesRepo.remove(f.id); setOpen((o) => o.filter((x) => x !== f.id)); if (active === f.id) setActive(null); }}><Trash size={14} /></button>
          </div>
        ))}
      </div>
      <Select value={theme} onChange={(v) => setTheme(v as CmTheme)} options={[{ value: "one-dark", label: "One Dark" }, { value: "nord", label: "Nord" }, { value: "dracula", label: "Dracula" }]} />
    </Card>
  );
  const editor = (
    <Card className="gap-2">
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto no-scrollbar">
        {open.map((id) => { const f = files.find((x) => x.id === id); return f ? (
          <span key={id} className={`flex items-center rounded-full border-[1.5px] border-line ${id === active ? "bg-ink text-paper" : ""}`}><button className="min-h-9 px-3 font-mono text-xs font-bold" onClick={() => setActive(id)}>{f.name}</button><button aria-label={`Close ${f.name}`} className="pr-2" onClick={() => { setOpen((o) => o.filter((x) => x !== id)); if (active === id) setActive(open.find((x) => x !== id) ?? null); }}><X size={12} /></button></span>
        ) : null; })}
        <button className="btn btn-lime btn-sm ml-auto shrink-0" onClick={() => void run()} disabled={!cur || kernel.status === "busy"}><Play size={14} weight="fill" />Run</button>
      </div>
      <div className="min-h-0 flex-1">{cur ? <CodeEditor value={value} onChange={edit} language={lang} theme={theme} /> : <p className="p-4 text-sm text-muted">Open a file from the tree.</p>}</div>
      {issue && <p className="text-xs font-bold text-red-600" role="alert">Syntax: {issue}</p>}
      {lang === "python" && kernel.status === "loading" && <p className="text-xs text-muted">{kernel.message}...</p>}
    </Card>
  );
  const out = (
    <Card className="gap-2">
      <CardTitle right={<span className="flex gap-1"><Eye size={18} aria-hidden /><Robot size={18} aria-hidden /></span>}>Output</CardTitle>
      {preview && <iframe ref={frame} title="Live preview" sandbox="allow-scripts" srcDoc={preview} className="h-1/2 min-h-24 w-full shrink-0 rounded-[20px] border border-line/30 bg-white" />}
      <div className="scroll-thin min-h-16 flex-1 rounded-[20px] bg-ink p-3 font-mono text-xs text-paper" role="log" aria-label="Console">
        {lines.length === 0 ? <span className="opacity-60">Console output appears here.</span> : lines.map((l, i) => <pre key={i} className={`whitespace-pre-wrap ${l.level === "error" ? "text-red-400" : l.level === "warn" ? "text-yellow-300" : ""}`}>{l.text}</pre>)}
      </div>
      <div className="flex flex-wrap gap-1">{AI_ACTIONS.map(([l, p]) => <button key={l} className="chip !min-h-8 text-xs" disabled={ai.busy || !cur} onClick={() => void ask(p)}>{l}</button>)}</div>
      {(ai.out || ai.busy) && <div className="scroll-thin max-h-48 rounded-[20px] bg-soft p-3">{ai.out ? <MarkdownView source={ai.out} className="!text-xs" /> : "Thinking..."}</div>}
    </Card>
  );
  return (
    <Panels className="lg:grid-cols-12 sm:grid-cols-2" panels={[
      { id: "files", label: "Files", className: "lg:col-span-2 sm:col-span-2", node: tree },
      { id: "editor", label: "Editor", className: "lg:col-span-6", node: editor },
      { id: "out", label: "Output", className: "lg:col-span-4", node: out },
    ]} />
  );
}
export type { CodeFile };
