"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ArrowCounterClockwise, Database, DownloadSimple, Play, Plus, Stop, Trash, UploadSimple, X } from "@phosphor-icons/react";
import { Panels } from "@/components/shell/Panels";
import { BentoCard } from "@/components/shell/BentoCard";
import { EmptyState, HeroCard } from "@/components/ui/design-primitives";
import { PageFrame, Skeleton } from "@/components/ui/misc";
import { emit } from "@/core/events";
import { notebooksRepo } from "@/core/repos";
import type { NbCell, NbOutput, Notebook } from "@/core/types";
import { deleteWithUndo, useRows } from "@/features/shared/hooks";
import { strobiSay } from "@/features/strobi/toast";
import { MarkdownView } from "@/lib/MarkdownView";
import { removePyFile, restartKernel, runPython, useKernel, writePyFile } from "@/lib/pyodide/kernel";
import { downloadBlob, uid } from "@/lib/utils";
import { fromIpynb, toIpynb } from "./ipynb";

const MAX_DATASET_BYTES = 25 * 1024 * 1024;
function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function datasetSnippet(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "csv") return `import pandas as pd\ndf = pd.read_csv('${name}')\nprint(df.head())`;
  if (ext === "tsv") return `import pandas as pd\ndf = pd.read_csv('${name}', sep='\\t')\nprint(df.head())`;
  if (ext === "json") return `import json\nwith open('${name}') as f:\n    data = json.load(f)\nprint(type(data), len(data) if hasattr(data, '__len__') else '')`;
  if (ext === "xlsx") return `import pandas as pd\ndf = pd.read_excel('${name}')\nprint(df.head())`;
  if (ext === "parquet") return `import pandas as pd\ndf = pd.read_parquet('${name}')\nprint(df.head())`;
  return `with open('${name}') as f:\n    print(f.read()[:500])`;
}

const CodeEditor = dynamic(() => import("@/features/code/CodeEditor"), { ssr: false, loading: () => <Skeleton className="h-20" /> });
const IRIS = "sepal_length,sepal_width,petal_length,petal_width,species\n5.1,3.5,1.4,0.2,setosa\n4.9,3.0,1.4,0.2,setosa\n4.7,3.2,1.3,0.2,setosa\n7.0,3.2,4.7,1.4,versicolor\n6.4,3.2,4.5,1.5,versicolor\n6.9,3.1,4.9,1.5,versicolor\n6.3,3.3,6.0,2.5,virginica\n5.8,2.7,5.1,1.9,virginica\n7.1,3.0,5.9,2.1,virginica";
const TITANIC = "PassengerId,Survived,Pclass,Name,Sex,Age,Fare\n1,0,3,Braund,male,22,7.25\n2,1,1,Cumings,female,38,71.28\n3,1,3,Heikkinen,female,26,7.92\n4,1,1,Futrelle,female,35,53.1\n5,0,3,Allen,male,35,8.05\n6,0,3,Moran,male,,8.46\n7,0,1,McCarthy,male,54,51.86";
const RECIPES = [{ file: "iris.csv", label: "Iris", data: IRIS }, { file: "titanic.csv", label: "Titanic sample", data: TITANIC }];
const newCell = (type: NbCell["type"], source = ""): NbCell => ({ id: uid(), type, source, outputs: [], count: null });
const STARTER = [newCell("markdown", "# Untitled notebook\n\nInline math works: $e^{i\\pi}+1=0$."), newCell("code", "import numpy as np\nprint(np.arange(5) ** 2)")];

function Outputs({ outs }: { outs: NbOutput[] }) {
  return <div className="space-y-1 rounded-[16px] bg-soft p-2">{outs.map((o, i) => o.kind === "image" ? <img key={i} alt="Figure" src={`data:image/png;base64,${o.data}`} className="max-w-full rounded-xl bg-white" /> : <pre key={i} className={`whitespace-pre-wrap font-mono text-xs ${o.kind === "stderr" || o.kind === "error" ? "text-[var(--danger-text)]" : ""}`}>{o.text}</pre>)}</div>;
}
export function NotebookPage() {
  const books = useRows(notebooksRepo);
  const [id, setId] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const k = useKernel();
  const file = useRef<HTMLInputElement>(null);
  const datasetInput = useRef<HTMLInputElement>(null);
  const [counter, setCounter] = useState(0);
  const [datasets, setDatasets] = useState<{ name: string; size: number }[]>([]);
  const nb = books?.find((b) => b.id === id) ?? books?.[0];
  useEffect(() => { if (books && books.length === 0) void notebooksRepo.add({ name: "Welcome", cells: STARTER }); }, [books]);
  if (!books || !nb) return <PageFrame title="Notebook" subtitle="Loading"><Skeleton className="flex-1" /></PageFrame>;
  const save = (cells: NbCell[]) => void notebooksRepo.update(nb.id, { cells });
  const patch = (cid: string, p: Partial<NbCell>) => save(nb.cells.map((c) => (c.id === cid ? { ...c, ...p } : c)));
  async function run(c: NbCell) {
    setRunning(c.id); emit("code.ran", { lang: "python" });
    const n = counter + 1; setCounter(n);
    try {
      const r = await runPython(c.source);
      const outputs: NbOutput[] = [...(r.stdout ? [{ kind: "stdout" as const, text: r.stdout }] : []), ...(r.stderr ? [{ kind: "stderr" as const, text: r.stderr }] : []), ...(r.value ? [{ kind: "result" as const, text: r.value }] : []), ...r.images.map((data) => ({ kind: "image" as const, data })), ...(r.error ? [{ kind: "error" as const, text: r.error }] : [])];
      patch(c.id, { outputs, count: n });
    } catch (e) { patch(c.id, { outputs: [{ kind: "error", text: e instanceof Error ? e.message : "Run failed" }] }); }
    setRunning(null);
  }
  const runAll = async () => { for (const c of nb.cells) if (c.type === "code") await run(c); };
  const addRecipe = async (r: (typeof RECIPES)[number]) => { await writePyFile(r.file, r.data); save([...nb.cells, newCell("code", `import pandas as pd\ndf = pd.read_csv('${r.file}')\nprint(df.head())\nprint(df.describe())`)]); };
  const handleDatasets = async (list: FileList | null) => {
    if (!list?.length) return;
    for (const f of Array.from(list)) {
      if (f.size > MAX_DATASET_BYTES) {
        strobiSay(`${f.name} is over 25 MB — skipped to keep browser memory fast.`, "error");
        continue;
      }
      const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_") || `dataset_${Date.now()}.csv`;
      await writePyFile(safeName, f);
      setDatasets((prev) => [...prev.filter((d) => d.name !== safeName), { name: safeName, size: f.size }]);
      strobiSay(`Attached ${safeName} (${fmtBytes(f.size)})`);
    }
  };
  const files = (
    <BentoCard
      title="Files"
      action={<div className="flex gap-1"><button className="btn btn-sm btn-icon" aria-label="New notebook" onClick={() => void notebooksRepo.add({ name: "Untitled", cells: STARTER.map((c) => ({ ...c, id: uid() })) }).then((b) => setId(b.id))}><Plus size={16} weight="bold" /></button><button className="btn btn-sm btn-icon" aria-label="Import .ipynb" onClick={() => file.current?.click()}><UploadSimple size={16} /></button></div>}
      className="h-full surface-inverse"
      bodyClassName="gap-2"
    >
      <input ref={file} hidden type="file" accept=".ipynb" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const b = await notebooksRepo.add(fromIpynb(await f.text(), f.name)); setId(b.id); } catch { alert("That file is not a valid notebook."); } e.target.value = ""; }} />
      <input ref={datasetInput} hidden type="file" multiple accept=".csv,.tsv,.json,.txt,.xlsx,.parquet" onChange={(e) => { void handleDatasets(e.target.files); e.target.value = ""; }} />
      <div className="scroll-thin min-h-0 flex-1 space-y-1">{books.map((b) => <div key={b.id} className={`flex items-center rounded-full ${b.id === nb.id ? "bg-primary text-on-primary" : "hover:bg-soft"}`}><button className="min-h-10 flex-1 truncate px-3 text-left text-sm font-bold" onClick={() => setId(b.id)}>{b.name}</button><button className="px-2" aria-label={`Delete ${b.name}`} onClick={() => void deleteWithUndo(notebooksRepo, b.id, "notebook")}><Trash size={14} /></button></div>)}</div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-muted">Datasets</p>
        <button type="button" className="btn btn-sm !min-h-7 px-2 text-xs" onClick={() => datasetInput.current?.click()}>
          <Database size={13} weight="bold" /> Add file
        </button>
      </div>
      {datasets.length > 0 && (
        <div className="scroll-thin max-h-28 space-y-1">
          {datasets.map((d) => (
            <div key={d.name} className="flex items-center gap-1 rounded-xl border border-border/30 bg-surface/10 px-2 py-1 text-xs">
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left font-mono font-semibold hover:underline"
                title={`Insert code cell for ${d.name}`}
                onClick={() => save([...nb.cells, newCell("code", datasetSnippet(d.name))])}
              >
                {d.name}
              </button>
              <span className="shrink-0 text-[10px] opacity-70 num">{fmtBytes(d.size)}</span>
              <button
                type="button"
                aria-label={`Remove ${d.name}`}
                className="shrink-0 p-0.5 opacity-75 hover:opacity-100"
                onClick={() => { void removePyFile(d.name); setDatasets((prev) => prev.filter((x) => x.name !== d.name)); }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">{RECIPES.map((r) => <button key={r.file} className="chip" onClick={() => void addRecipe(r)}>{r.label}</button>)}</div>
    </BentoCard>
  );
  const book = (
    <HeroCard tint="notes" hardShadow className="h-full" bodyClassName="gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input className="input min-w-0 flex-1 !font-display !font-extrabold" aria-label="Notebook name" key={nb.id} defaultValue={nb.name} onBlur={(e) => void notebooksRepo.update(nb.id, { name: e.target.value || nb.name })} />
        <button className="btn btn-lime btn-sm" onClick={() => void runAll()} disabled={k.status === "busy"}><Play size={14} weight="fill" />Run all</button>
        <button className="btn btn-sm" onClick={() => { restartKernel(); setRunning(null); }} aria-label="Interrupt kernel"><Stop size={14} weight="fill" />Interrupt</button>
        <button className="btn btn-sm" onClick={() => { restartKernel(); setCounter(0); }}><ArrowCounterClockwise size={14} weight="bold" />Restart</button>
        <button className="btn btn-sm btn-icon" aria-label="Export .ipynb" onClick={() => downloadBlob(`${nb.name}.ipynb`, toIpynb(nb as Notebook), "application/json")}><DownloadSimple size={16} /></button>
      </div>
      <p className="text-xs text-muted" role="status">Kernel: {k.status}{k.message ? ` · ${k.message}` : ""}. Python loads on first run.</p>
      <div className="scroll-thin min-h-0 flex-1 space-y-3">
        {nb.cells.length === 0 && <EmptyState title="Empty notebook" hint="Add a code or markdown cell to start." mood="happy" action={<button className="btn btn-lime" onClick={() => save([newCell("code")])}>Add a cell</button>} />}
        {nb.cells.map((c) => (
          <div key={c.id} className="group rounded-[24px] border border-border-strong/25 bg-surface p-2">
            <div className="mb-1 flex items-center gap-2 text-xs"><span className="num w-10 font-mono font-bold text-muted">[{c.count ?? " "}]</span>
              {c.type === "code" && <button className="btn btn-sm btn-ink !min-h-8" onClick={() => void run(c)} disabled={running !== null}><Play size={12} weight="fill" />{running === c.id ? "Running" : "Run"}</button>}
              <button className="chip !min-h-8" onClick={() => patch(c.id, { type: c.type === "code" ? "markdown" : "code" })}>{c.type}</button>
              <button className="ml-auto" aria-label="Delete cell" onClick={() => save(nb.cells.filter((x) => x.id !== c.id))}><Trash size={14} /></button></div>
            {c.type === "code" ? <div className="min-h-16"><CodeEditor value={c.source} onChange={(v) => patch(c.id, { source: v })} language="python" height="auto" /></div> : <textarea className="input !min-h-20" aria-label="Markdown cell" value={c.source} onChange={(e) => patch(c.id, { source: e.target.value })} />}
            {c.type === "markdown" && <MarkdownView source={c.source} className="px-2" />}
            {c.type === "code" && c.outputs.length > 0 && <Outputs outs={c.outputs} />}
          </div>
        ))}
        <div className="flex gap-2"><button className="btn btn-sm" onClick={() => save([...nb.cells, newCell("code")])}><Plus size={14} />Code</button><button className="btn btn-sm" onClick={() => save([...nb.cells, newCell("markdown")])}><Plus size={14} />Markdown</button></div>
      </div>
    </HeroCard>
  );
  return (
    <PageFrame title="Notebook" subtitle="Jupyter-compatible cells running Python in your browser.">
      <Panels className="lg:grid-cols-12" panels={[{ id: "files", label: "Files", className: "lg:col-span-3", node: files }, { id: "nb", label: "Notebook", className: "lg:col-span-9", node: book }]} />
    </PageFrame>
  );
}
