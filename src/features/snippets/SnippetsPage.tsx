"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Plus, Terminal, Trash } from "@phosphor-icons/react";
import { BentoCard } from "@/components/shell/BentoCard";
import { EmptyState, HeroCard } from "@/components/ui/design-primitives";
import { PageFrame, Segmented } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { Field, Select } from "@/components/ui/fields";
import { codeFilesRepo, snippetsRepo } from "@/core/repos";
import { deleteWithUndo, useRows } from "@/features/shared/hooks";
import { strobiSay } from "@/features/strobi/toast";

const LANGS = ["python", "javascript", "typescript", "cpp", "java", "rust", "html", "css"];
const EXT: Record<string, string> = { python: "py", javascript: "js", typescript: "ts", cpp: "cpp", java: "java", rust: "rs", html: "html", css: "css" };
const SAMPLES = [
  { title: "Binary search", language: "python", code: "def bs(a, x):\n    lo, hi = 0, len(a) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if a[mid] == x: return mid\n        if a[mid] < x: lo = mid + 1\n        else: hi = mid - 1\n    return -1", tags: ["search"] },
  { title: "Debounce", language: "javascript", code: "const debounce = (fn, ms) => {\n  let t;\n  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };\n};", tags: ["util"] },
  { title: "Two pointers", language: "cpp", code: "int l = 0, r = n - 1;\nwhile (l < r) {\n  // move pointers based on condition\n}", tags: ["pattern"] },
];
export function SnippetsPage() {
  const rows = useRows(snippetsRepo) ?? [];
  const router = useRouter();
  const [lang, setLang] = useState("all");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", language: "python", code: "", tags: "" });
  const shown = rows.filter((r) => lang === "all" || r.language === lang);
  const copy = async (code: string) => { await navigator.clipboard?.writeText(code).catch(() => undefined); strobiSay("Snippet copied", "tip"); };
  const openInArena = async (s: (typeof rows)[number]) => { await codeFilesRepo.add({ project: "code", name: `${s.title.replace(/\W+/g, "_")}.${EXT[s.language] ?? "txt"}`, content: s.code, language: s.language }); router.push("/code"); };
  return (
    <PageFrame title="Snippets" subtitle="Reusable code, one click from the Code Arena." actions={<button className="btn btn-lime" onClick={() => setOpen(true)}><Plus size={18} weight="bold" />New</button>}>
      <Segmented value={lang} onChange={setLang} className="max-w-full shrink-0 self-start overflow-x-auto no-scrollbar" options={[{ value: "all", label: "All" }, ...LANGS.map((l) => ({ value: l, label: l }))]} />
      <div className="scroll-thin grid min-h-0 flex-1 content-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.length === 0 && (
          <HeroCard tint="tools" hardShadow className="col-span-full min-h-[320px]">
            <EmptyState title="No snippets yet" hint="Save code you reuse. Or start with three samples." mood="happy" ghostCount={2} ghostLabel="Code" action={<button className="btn btn-lime" onClick={() => SAMPLES.forEach((s) => void snippetsRepo.add(s))}>Add samples</button>} />
          </HeroCard>
        )}
        {shown.map((s) => (
          <BentoCard key={s.id} title={s.title} action={<span className="chip !min-h-6 text-[11px]">{s.language}</span>} className="h-full" bodyClassName="gap-2">
            <pre className="scroll-thin max-h-40 min-h-0 flex-1 overflow-auto rounded-[20px] bg-surface-inverse p-3 font-mono text-xs text-on-inverse">{s.code}</pre>
            <div className="flex gap-2"><button className="btn btn-sm" onClick={() => void copy(s.code)}><Copy size={14} />Copy</button><button className="btn btn-sm btn-ink" onClick={() => void openInArena(s)}><Terminal size={14} />Open in Code Arena</button><button className="btn btn-sm btn-icon ml-auto" aria-label="Delete snippet" onClick={() => void deleteWithUndo(snippetsRepo, s.id, "snippet")}><Trash size={14} /></button></div>
          </BentoCard>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="New snippet">
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (!f.title.trim() || !f.code.trim()) return; void snippetsRepo.add({ title: f.title.trim(), language: f.language, code: f.code, tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean) }); setOpen(false); setF({ ...f, title: "", code: "" }); }}>
          <Field label="Title"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus /></Field>
          <Field label="Language"><Select value={f.language} onChange={(v) => setF({ ...f, language: v })} options={LANGS.map((l) => ({ value: l, label: l }))} /></Field>
          <Field label="Code"><textarea className="input !min-h-32 font-mono text-xs" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field>
          <button className="btn btn-lime" type="submit">Save snippet</button>
        </form>
      </Modal>
    </PageFrame>
  );
}
