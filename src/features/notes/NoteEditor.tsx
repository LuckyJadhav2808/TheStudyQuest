"use client";
import { Markdown } from "@tiptap/markdown";
import { Placeholder } from "@tiptap/extension-placeholder";
import { CharacterCount } from "@tiptap/extension-character-count";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";
import { Code, DownloadSimple, ListBullets, ListChecks, MagicWand, Quotes, Table as TableIcon, TextB, TextItalic, TextHTwo, Graph, Printer } from "@phosphor-icons/react";
import { Segmented } from "@/components/ui/misc";
import { Select } from "@/components/ui/fields";
import { notesRepo } from "@/core/repos";
import type { Note } from "@/core/types";
import { MarkdownView } from "@/lib/MarkdownView";
import { strobiSay, strobiToast } from "@/features/strobi/toast";
import { AI_ACTIONS, exportNote, runAiAction, type AiAction } from "./noteActions";
import { MermaidModal } from "./MermaidModal";

type Mode = "rich" | "source" | "preview";
const MATH = ["\\alpha", "\\beta", "\\theta", "\\lambda", "\\pi", "\\sigma", "\\sum_{i=1}^{n}", "\\int_a^b", "\\frac{a}{b}", "\\sqrt{x}", "x^{2}", "\\infty", "\\leq", "\\geq", "\\neq", "\\approx", "\\to", "\\nabla"];
export const PRINT_THEMES = [["modern", "Modern Clean"], ["dark", "Dark"], ["academic", "Academic Journal"], ["sepia", "Sepia"]] as const;

export function NoteEditor({ note, onPrint }: { note: Note; onPrint: (theme: string) => void }) {
  const [mode, setMode] = useState<Mode>("rich");
  const [content, setContent] = useState(note.content);
  const [busy, setBusy] = useState(false);
  const [mermaid, setMermaid] = useState(false);
  const [theme, setTheme] = useState("modern");
  const src = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(content);

  const save = (md: string) => {
    latest.current = md;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void notesRepo.update(note.id, { content: md }), 500);
  };
  useEffect(() => () => { clearTimeout(timer.current); void notesRepo.update(note.id, { content: latest.current }); }, [note.id]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Markdown, Placeholder.configure({ placeholder: "Start writing. Markdown shortcuts work." }), CharacterCount, TaskList, TaskItem.configure({ nested: true }), Table, TableRow, TableHeader, TableCell],
    content: note.content,
    contentType: "markdown",
    editorProps: { attributes: { class: "tiptap prose-sq", "aria-label": "Note editor" } },
    onUpdate: ({ editor: e }) => { const md = e.getMarkdown(); setContent(md); save(md); },
  });
  const setBoth = (md: string) => { setContent(md); save(md); editor?.commands.setContent(md, { contentType: "markdown" }); };
  const insertSource = (text: string) => {
    const el = src.current;
    if (!el) return setBoth(content + text);
    const next = content.slice(0, el.selectionStart) + text + content.slice(el.selectionEnd);
    setContent(next); save(next);
  };
  const changeMode = (m: Mode) => { if (m === "rich" && editor) editor.commands.setContent(content, { contentType: "markdown" }); setMode(m); };
  async function ai(action: AiAction) {
    if (!action) return;
    setBusy(true);
    try {
      const before = content;
      const r = await runAiAction(action, { ...note, content });
      if (r.content) { setBoth(r.content); strobiSay(r.message, "tip", { action: { label: "Undo", onClick: () => setBoth(before) } }); }
      else strobiSay(r.message, "tip");
    } catch (e) { strobiSay(e instanceof Error ? e.message : "AI failed", "error"); }
    setBusy(false);
  }
  const tb = (label: string, icon: React.ReactNode, fn: () => void, on?: boolean) => (
    <button key={label} type="button" aria-label={label} aria-pressed={on} onClick={fn} className={`grid size-9 place-items-center rounded-full ${on ? "bg-ink text-paper" : "hover:bg-soft"}`}>{icon}</button>
  );
  const c = editor?.chain().focus();
  const cur = { ...note, content };
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input className="input min-w-0 flex-1 !font-display !text-lg !font-extrabold" aria-label="Note title" defaultValue={note.title} onChange={(e) => void notesRepo.update(note.id, { title: e.target.value })} />
        <Segmented<Mode> value={mode} onChange={changeMode} options={[{ value: "rich", label: "Rich" }, { value: "source", label: "Source" }, { value: "preview", label: "Preview" }]} />
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {mode === "rich" && editor && <>
          {tb("Bold", <TextB size={18} weight="bold" />, () => c?.toggleBold().run(), editor.isActive("bold"))}
          {tb("Italic", <TextItalic size={18} />, () => c?.toggleItalic().run(), editor.isActive("italic"))}
          {tb("Heading", <TextHTwo size={18} />, () => c?.toggleHeading({ level: 2 }).run(), editor.isActive("heading"))}
          {tb("Bullet list", <ListBullets size={18} />, () => c?.toggleBulletList().run(), editor.isActive("bulletList"))}
          {tb("Task list", <ListChecks size={18} />, () => c?.toggleTaskList().run(), editor.isActive("taskList"))}
          {tb("Quote", <Quotes size={18} />, () => c?.toggleBlockquote().run(), editor.isActive("blockquote"))}
          {tb("Code block", <Code size={18} />, () => c?.toggleCodeBlock().run(), editor.isActive("codeBlock"))}
          {tb("Table", <TableIcon size={18} />, () => c?.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}
        </>}
        {tb("Mermaid diagram", <Graph size={18} />, () => setMermaid(true))}
        <span className="mx-1 h-5 w-px bg-line/30" />
        <label className="sr-only" htmlFor="ai-act">AI action</label>
        <select id="ai-act" disabled={busy} className="input !min-h-9 max-w-40 !text-xs" value="" onChange={(e) => void ai(e.target.value as AiAction)}>
          <option value="">{busy ? "Thinking..." : "AI actions"}</option>
          {AI_ACTIONS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
        <MagicWand size={16} className="text-violet" aria-hidden />
        <span className="ml-auto flex items-center gap-1">
          <Select className="!min-h-9 max-w-36 !text-xs" value={theme} onChange={setTheme} options={PRINT_THEMES.map(([v, l]) => ({ value: v, label: l }))} />
          {tb("Print or save as PDF", <Printer size={18} />, () => onPrint(theme))}
          {tb("Download .md", <DownloadSimple size={18} />, () => void exportNote(cur, "md"))}
          <button className="chip !min-h-8 text-xs" onClick={() => void exportNote(cur, "html")}>.html</button>
          <button className="chip !min-h-8 text-xs" onClick={() => void exportNote(cur, "txt")}>.txt</button>
        </span>
      </div>
      {mode === "source" && (
        <div className="flex gap-1 overflow-x-auto no-scrollbar py-1" aria-label="Math symbols">
          {MATH.map((m) => <button key={m} className="chip !min-h-8 shrink-0 font-mono text-xs" onClick={() => insertSource(`$${m}$`)}>{m.slice(0, 12)}</button>)}
        </div>
      )}
      <div className="scroll-thin min-h-0 flex-1 rounded-[24px] bg-soft p-4">
        {mode === "rich" && <EditorContent editor={editor} className="h-full" />}
        {mode === "source" && <textarea ref={src} aria-label="Markdown source" spellCheck={false} className="h-full w-full resize-none bg-transparent font-mono text-sm outline-none" value={content} onChange={(e) => { setContent(e.target.value); save(e.target.value); }} />}
        {mode === "preview" && <MarkdownView source={content} />}
      </div>
      <p className="num text-right text-[11px] text-muted">{editor ? `${editor.storage.characterCount.words()} words` : ""} · autosaved on this device</p>
      <MermaidModal open={mermaid} onClose={() => setMermaid(false)} onInsert={(b) => { if (mode === "source") insertSource(b); else { setBoth(content + b); strobiToast("saved", { what: "diagram" }); } }} />
    </div>
  );
}
