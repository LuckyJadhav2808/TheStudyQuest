"use client";
import { useState } from "react";
import { Play } from "@phosphor-icons/react";
import { MarkdownView } from "@/lib/MarkdownView";
import { runPython, useKernel, type PyResult } from "@/lib/pyodide/kernel";
import { emit } from "@/core/events";

function Block({ code }: { code: string }) {
  const [src, setSrc] = useState(code);
  const [res, setRes] = useState<PyResult | null>(null);
  const k = useKernel();
  const run = async () => { emit("code.ran", { lang: "python" }); try { setRes(await runPython(src)); } catch (e) { setRes({ stdout: "", stderr: "", error: e instanceof Error ? e.message : "failed", images: [] }); } };
  return (
    <div className="my-3 overflow-hidden rounded-[24px] bg-ink text-paper">
      <textarea aria-label="Python code" spellCheck={false} className="block w-full resize-y bg-transparent p-4 font-mono text-xs outline-none" rows={Math.min(10, src.split("\n").length + 1)} value={src} onChange={(e) => setSrc(e.target.value)} />
      <div className="flex items-center gap-3 border-t border-white/10 px-4 py-2"><button className="btn btn-lime btn-sm" onClick={() => void run()} disabled={k.status === "busy"}><Play size={14} weight="fill" />Run</button><span className="text-xs opacity-70">{k.status === "loading" ? k.message : ""}</span></div>
      {res && <pre className="whitespace-pre-wrap border-t border-white/10 p-4 font-mono text-xs">{res.stdout}{res.stderr}{res.error && <span className="text-red-400">{res.error}</span>}{res.images.map((b, i) => <img key={i} alt="Plot output" src={`data:image/png;base64,${b}`} className="mt-2 rounded-xl bg-white" />)}</pre>}
    </div>
  );
}
/** Renders markdown, turning ```python fences into runnable blocks (Pyodide worker). */
export function RunnableLesson({ md }: { md: string }) {
  const parts = md.split(/```python\n([\s\S]*?)```/g);
  return <>{parts.map((p, i) => (i % 2 === 1 ? <Block key={i} code={p.trimEnd()} /> : p.trim() ? <MarkdownView key={i} source={p} /> : null))}</>;
}
