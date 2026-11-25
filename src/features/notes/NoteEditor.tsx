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
import { Code, DownloadSimple, ListBullets, ListChecks, MagicWand, Quotes, Table as TableIcon, TextB, TextItalic, TextHTwo, Graph, CaretDown } from "@phosphor-icons/react";
import { Segmented } from "@/components/ui/misc";
import { Select } from "@/components/ui/fields";
import { emit } from "@/core/events";
import { notesRepo } from "@/core/repos";
import type { Note } from "@/core/types";
import { MarkdownView } from "@/lib/MarkdownView";
import { strobiSay, strobiToast } from "@/features/strobi/toast";
import { AI_ACTIONS, exportNote, runAiAction, type AiAction } from "./noteActions";
import { MermaidModal } from "./MermaidModal";

type Mode = "rich" | "source" | "preview";
const MATH = ["\\alpha", "\\beta", "\\theta", "\\lambda", "\\pi", "\\sigma", "\\sum_{i=1}^{n}", "\\int_a^b", "\\frac{a}{b}", "\\sqrt{x}", "x^{2}", "\\infty", "\\leq", "\\geq", "\\neq", "\\approx", "\\to", "\\nabla"];

export function NoteEditor({
  note,
  onPrint,
  dock,
  setDock,
}: {
  note: Note;
  onPrint: (theme: string) => void;
  dock?: string;
  setDock?: (v: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("rich");
  const [content, setContent] = useState(note.content);
  const [busy, setBusy] = useState(false);
  const [mermaid, setMermaid] = useState(false);
  const src = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(content);

  const rewardedRef = useRef(false);
  const save = (md: string) => {
    latest.current = md;
    if (!rewardedRef.current && md.trim().length >= 20) {
      rewardedRef.current = true;
      try {
        const raw = localStorage.getItem("sq-rewarded-notes");
        const ids = raw ? (JSON.parse(raw) as string[]) : [];
        if (!ids.includes(note.id)) {
          localStorage.setItem("sq-rewarded-notes", JSON.stringify([...ids.slice(-100), note.id]));
          emit("note.created", { title: note.title });
        }
      } catch {
        emit("note.created", { title: note.title });
      }
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void notesRepo.update(note.id, { content: md }), 500);
  };
  useEffect(() => () => {
    clearTimeout(timer.current);
    void notesRepo.update(note.id, { content: latest.current });
  }, [note.id]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Markdown,
      Placeholder.configure({ placeholder: "Start writing. Markdown shortcuts work." }),
      CharacterCount,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table,
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: note.content,
    contentType: "markdown",
    editorProps: { attributes: { class: "tiptap prose-sq", "aria-label": "Note editor" } },
    onUpdate: ({ editor: e }) => {
      const md = e.getMarkdown();
      setContent(md);
      save(md);
    },
  });

  const setBoth = (md: string) => {
    setContent(md);
    save(md);
    editor?.commands.setContent(md, { contentType: "markdown" });
  };

  const insertSource = (text: string) => {
    const el = src.current;
    if (!el) return setBoth(content + text);
    const next = content.slice(0, el.selectionStart) + text + content.slice(el.selectionEnd);
    setContent(next);
    save(next);
  };

  const changeMode = (m: Mode) => {
    if (m === "rich" && editor) editor.commands.setContent(content, { contentType: "markdown" });
    setMode(m);
  };

  async function ai(action: AiAction) {
    if (!action) return;
    setBusy(true);
    try {
      const before = content;
      const r = await runAiAction(action, { ...note, content });
      if (r.content) {
        setBoth(r.content);
        strobiSay(r.message, "tip", { action: { label: "Undo", onClick: () => setBoth(before) } });
      } else strobiSay(r.message, "tip");
    } catch (e) {
      strobiSay(e instanceof Error ? e.message : "AI failed", "error");
    }
    setBusy(false);
  }

  const handleExport = (kind: string) => {
    if (!kind) return;
    if (kind === "print") onPrint("modern");
    else void exportNote({ ...note, content }, kind as "md" | "html" | "txt");
  };

  const tb = (label: string, icon: React.ReactNode, fn: () => void, on?: boolean) => (
    <button
      key={label}
      type="button"
      aria-label={label}
      aria-pressed={on}
      onClick={fn}
      className={`grid size-8 place-items-center rounded-full transition ${on ? "bg-ink text-paper" : "text-muted hover:bg-soft hover:text-fg"}`}
    >
      {icon}
    </button>
  );

  const c = editor?.chain().focus();
  const words = editor ? editor.storage.characterCount.words() : 0;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-2 shrink-0">
        <input
          className="input min-w-0 flex-1 !font-display !text-base sm:!text-lg !font-extrabold !min-h-10"
          aria-label="Note title"
          defaultValue={note.title}
          onChange={(e) => void notesRepo.update(note.id, { title: e.target.value })}
        />
        <Segmented<Mode>
          value={mode}
          onChange={changeMode}
          options={[
            { value: "rich", label: "Rich" },
            { value: "source", label: "Source" },
            { value: "preview", label: "Preview" },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-line/40 pb-1.5 shrink-0">
        <div className="flex items-center gap-0.5 flex-wrap">
          {mode === "rich" && editor && (
            <>
              {tb("Bold", <TextB size={16} weight="bold" />, () => c?.toggleBold().run(), editor.isActive("bold"))}
              {tb("Italic", <TextItalic size={16} />, () => c?.toggleItalic().run(), editor.isActive("italic"))}
              {tb("Heading", <TextHTwo size={16} />, () => c?.toggleHeading({ level: 2 }).run(), editor.isActive("heading"))}
              {tb("Bullet list", <ListBullets size={16} />, () => c?.toggleBulletList().run(), editor.isActive("bulletList"))}
              {tb("Task list", <ListChecks size={16} />, () => c?.toggleTaskList().run(), editor.isActive("taskList"))}
              {tb("Quote", <Quotes size={16} />, () => c?.toggleBlockquote().run(), editor.isActive("blockquote"))}
              {tb("Code block", <Code size={16} />, () => c?.toggleCodeBlock().run(), editor.isActive("codeBlock"))}
              {tb("Table", <TableIcon size={16} />, () => c?.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}
            </>
          )}
          {tb("Mermaid diagram", <Graph size={16} />, () => setMermaid(true))}

          <span className="mx-1 h-4 w-px bg-line/30" />

          <div className="relative inline-flex items-center">
            <select
              aria-label="AI actions"
              disabled={busy}
              className="appearance-none rounded-full border border-line bg-surface py-1 pl-2.5 pr-7 text-xs font-bold text-fg hover:border-ink cursor-pointer outline-none"
              value=""
              onChange={(e) => void ai(e.target.value as AiAction)}
            >
              <option value="">{busy ? "Thinking..." : "AI actions"}</option>
              {AI_ACTIONS.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
            <MagicWand size={13} className="pointer-events-none absolute right-2 text-violet" aria-hidden />
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <div className="relative inline-flex items-center">
            <select
              aria-label="More options"
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (v.startsWith("dock:")) setDock?.(v.slice(5));
                else if (v.startsWith("exp:")) handleExport(v.slice(4));
              }}
              className="appearance-none rounded-full border border-line bg-surface py-1 pl-3 pr-7 text-xs font-bold text-fg hover:border-ink cursor-pointer outline-none"
            >
              <option value="">More</option>
              {setDock && (
                <optgroup label="Side dock">
                  <option value="dock:">No side dock</option>
                  <option value="dock:whiteboard">Dock: Whiteboard</option>
                  <option value="dock:code">Dock: Code</option>
                  <option value="dock:reader">Dock: Reader</option>
                </optgroup>
              )}
              <optgroup label="Export">
                <option value="exp:md">Export Markdown (.md)</option>
                <option value="exp:html">Export HTML (.html)</option>
                <option value="exp:txt">Export Text (.txt)</option>
                <option value="exp:print">Print / PDF</option>
              </optgroup>
            </select>
            <CaretDown size={12} className="pointer-events-none absolute right-2.5 text-muted" />
          </div>
        </div>
      </div>

      {mode === "source" && (
        <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5 shrink-0" aria-label="Math symbols">
          {MATH.map((m) => (
            <button key={m} className="chip !min-h-7 shrink-0 font-mono text-[11px]" onClick={() => insertSource(`$${m}$`)}>
              {m.slice(0, 12)}
            </button>
          ))}
        </div>
      )}

      <div className="scroll-thin min-h-0 flex-1 rounded-[24px] border-[1.5px] border-ink/25 bg-white text-ink px-6 sm:px-10 py-5 shadow-2xs transition focus-within:border-ink focus-within:shadow-[0_0_0_4px_rgba(217,255,69,0.4)]">
        <div className="mx-auto h-full max-w-[72ch]">
          {mode === "rich" && <EditorContent editor={editor} className="h-full" />}
          {mode === "source" && (
            <textarea
              ref={src}
              aria-label="Markdown source"
              spellCheck={false}
              className="h-full w-full resize-none bg-transparent font-mono text-sm outline-none"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                save(e.target.value);
              }}
            />
          )}
          {mode === "preview" && <MarkdownView source={content} />}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted px-1 shrink-0">
        <span className="num">{words} words · ~{Math.max(1, Math.ceil(words / 200))} min read · autosaved locally</span>
        <span className="font-mono text-[10px]">Markdown ready</span>
      </div>

      <MermaidModal
        open={mermaid}
        onClose={() => setMermaid(false)}
        onInsert={(b) => {
          if (mode === "source") insertSource(b);
          else {
            setBoth(content + b);
            strobiToast("saved", { what: "diagram" });
          }
        }}
      />
    </div>
  );
}
