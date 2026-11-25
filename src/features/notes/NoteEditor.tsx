"use client";
import { Markdown } from "@tiptap/markdown";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Highlight } from "@tiptap/extension-highlight";
import { Image as TiptapImage } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { Mathematics } from "@tiptap/extension-mathematics";
import { Placeholder } from "@tiptap/extension-placeholder";
import { CharacterCount } from "@tiptap/extension-character-count";
import { TableOfContents, type TableOfContentData } from "@tiptap/extension-table-of-contents";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";
import imageCompression from "browser-image-compression";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { format } from "date-fns";
import { ArrowLeft, ArrowsClockwise, CaretRight, Code, Columns, Function as FunctionIcon, Highlighter, Image as ImageIcon, Link as LinkIcon, ListBullets, ListChecks, MagicWand, Microphone, MicrophoneSlash, Quotes, Table as TableIcon, TextB, TextItalic, TextHTwo, Graph, CaretDown, Sparkle, Plus, Clock, Tag, Trash, UploadSimple, ArrowUUpLeft, ArrowUUpRight, X } from "@phosphor-icons/react";

const lowlight = createLowlight(common);
import { Segmented } from "@/components/ui/misc";
import { emit } from "@/core/events";
import { notesRepo } from "@/core/repos";
import type { Note } from "@/core/types";
import { askAI } from "@/lib/aiClient";
import { summarizeWithLocalAi } from "@/lib/localAi";
import { MarkdownView } from "@/lib/MarkdownView";
import { generateLocalStudyQuestion, suggestTags } from "@/lib/localNlp";
import { useDictation } from "@/lib/useDictation";
import { strobiSay, strobiToast } from "@/features/strobi/toast";
import { MATH_PALETTE } from "./autocompleteDataset";
import { AI_ACTIONS, exportNote, htmlToStudyMarkdown, runAiAction, type AiAction } from "./noteActions";
import { MermaidModal } from "./MermaidModal";
import { createSlashCommandExtension } from "./SlashCommand";
import { SmartAutocorrect } from "./SmartAutocorrect";
import { Callout } from "./CalloutExtension";
import { SPELLCHECK_META, SpellcheckExtension } from "./SpellcheckExtension";
import { getCachedSpellchecker, ignoreSpellWord } from "@/lib/spellcheck";

type Mode = "rich" | "source" | "preview";

export function NoteEditor({
  note,
  folderName,
  onBack,
  onPrint,
  dock,
  setDock,
}: {
  note: Note;
  folderName?: string;
  onBack?: () => void;
  onPrint: (theme: string) => void;
  dock?: string;
  setDock?: (v: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("rich");
  const [content, setContent] = useState(note.content);
  const [busy, setBusy] = useState(false);
  const [aiPct, setAiPct] = useState<number | null>(null);
  const [mermaid, setMermaid] = useState(false);
  const [showMath, setShowMath] = useState(false);
  const [inTable, setInTable] = useState(false);
  const [toc, setToc] = useState<TableOfContentData>([]);
  const [addingTag, setAddingTag] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [bubble, setBubble] = useState<{ top: number; left: number; text: string } | null>(null);
  const [spellMenu, setSpellMenu] = useState<{
    top: number;
    left: number;
    word: string;
    from: number;
    to: number;
    suggestions: string[];
  } | null>(null);
  const [rewriting, setRewriting] = useState(false);
  const [showQuizCard, setShowQuizCard] = useState(true);
  const [quizBusy, setQuizBusy] = useState(false);
  const [studyQuestion, setStudyQuestion] = useState(() =>
    generateLocalStudyQuestion(note.title, note.content)
  );
  const suggestedTags = useMemo(() => suggestTags(content, note.tags, 3), [content, note.tags]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const src = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(content);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

  const fileToDataUrl = async (file: File): Promise<string> => {
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.4,
      maxWidthOrHeight: 1400,
      useWebWorker: true,
    }).catch(() => file);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read image"));
      reader.readAsDataURL(compressed);
    });
  };

  const insertImageFile = async (file: File) => {
    try {
      const dataUrl = await fileToDataUrl(file);
      const alt = file.name.replace(/\.\w+$/, "") || "Pasted image";
      if (mode === "rich" && editor) {
        editor.chain().focus().setImage({ src: dataUrl, alt }).insertContent("<p></p>").run();
      } else {
        insertSource(`\n![${alt}](${dataUrl})\n`);
      }
      strobiSay("Image added to note");
    } catch {
      strobiSay("Could not insert image", "error");
    }
  };

  const headings = useMemo(() => {
    const out: { level: number; text: string; idx: number }[] = [];
    const re = /^(#{1,3})\s+(.+)$/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      out.push({ level: m[1].length, text: m[2].replace(/[*_`~]/g, "").trim(), idx: m.index });
    }
    return out;
  }, [content]);

  const debouncedPersist = useDebouncedCallback(
    (md: string) => {
      void notesRepo.update(note.id, { content: md });
    },
    500,
    { maxWait: 2500 }
  );

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
    debouncedPersist(md);
  };
  useEffect(() => () => {
    debouncedPersist.flush();
    void notesRepo.update(note.id, { content: latest.current });
  }, [note.id, debouncedPersist]);

  const slashExt = useMemo(() => createSlashCommandExtension(() => setMermaid(true)), []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false, link: false }),
      CodeBlockLowlight.configure({ lowlight }),
      Link.configure({ openOnClick: false, autolink: true }),
      Highlight,
      Mathematics.configure({ katexOptions: { throwOnError: false } }),
      TableOfContents.configure({ onUpdate: (data) => setToc(data) }),
      Markdown,
      Placeholder.configure({ placeholder: "Start writing, or type / for blocks & formulas..." }),
      CharacterCount,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table,
      TableRow,
      TableHeader,
      TableCell,
      TiptapImage.configure({ inline: false, allowBase64: true }),
      Callout,
      SmartAutocorrect,
      SpellcheckExtension,
      slashExt,
    ],
    content: note.content,
    contentType: "markdown",
    editorProps: {
      attributes: { class: "tiptap prose-sq", "aria-label": "Note editor", spellcheck: "false" },
      handleClick: (_view, _pos, event) => {
        const el = (event.target as HTMLElement | null)?.closest<HTMLElement>(".sq-spell-error");
        if (!el || !canvasRef.current) {
          setSpellMenu(null);
          return false;
        }
        const word = el.dataset.spellWord ?? "";
        const from = Number(el.dataset.spellFrom);
        const to = Number(el.dataset.spellTo);
        const checker = getCachedSpellchecker();
        if (!word || !Number.isFinite(from) || !Number.isFinite(to) || !checker) {
          setSpellMenu(null);
          return false;
        }
        const elRect = el.getBoundingClientRect();
        const boxRect = canvasRef.current.getBoundingClientRect();
        const top = Math.max(8, elRect.bottom - boxRect.top + canvasRef.current.scrollTop + 6);
        const left = Math.max(110, Math.min(boxRect.width - 110, elRect.left - boxRect.left + elRect.width / 2));
        setSpellMenu({
          top,
          left,
          word,
          from,
          to,
          suggestions: checker.suggest(word).slice(0, 5),
        });
        return false;
      },
      handlePaste: (_view, event) => {
        const items = Array.from(event.clipboardData?.items ?? []);
        const imgItem = items.find((i) => i.type.startsWith("image/"));
        const file = imgItem?.getAsFile();
        if (file) {
          event.preventDefault();
          void insertImageFile(file);
          return true;
        }
        const text = event.clipboardData?.getData("text/plain") ?? "";
        const html = event.clipboardData?.getData("text/html") ?? "";
        const looksLikeMarkdown =
          !html.trim() &&
          (/(^|\n)#{1,6}\s/.test(text) ||
            /(^|\n)```/.test(text) ||
            /(^|\n)\|.*\|/.test(text) ||
            /(^|\n)[-*+]\s/.test(text) ||
            /(^|\n)\d+\.\s/.test(text) ||
            /(^|\n)>\s/.test(text) ||
            /(^|\n)---+$/.test(text) ||
            /\*\*[^*]+\*\*/.test(text) ||
            /~~[^~]+~~/.test(text) ||
            /\[[^\]]+\]\([^)]+\)/.test(text) ||
            /\$[^$\n]+\$/.test(text));
        if (looksLikeMarkdown && editorRef.current) {
          event.preventDefault();
          const calloutRe = /(?:^|\n)>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n((?:>\s*.*(?:\n|$))+)/gi;
          if (calloutRe.test(text)) {
            calloutRe.lastIndex = 0;
            let last = 0;
            let match: RegExpExecArray | null;
            while ((match = calloutRe.exec(text)) !== null) {
              const before = text.slice(last, match.index).trim();
              if (before) editorRef.current.commands.insertContent(before, { contentType: "markdown" });
              const kind = match[1].toLowerCase();
              const body = match[2]
                .split("\n")
                .map((l) => l.replace(/^>\s?/, ""))
                .join("<br />")
                .trim();
              editorRef.current.commands.insertContent(
                `<div class="callout callout-${kind}" data-callout="${kind}"><p>${body}</p></div><p></p>`
              );
              last = match.index + match[0].length;
            }
            const rest = text.slice(last).trim();
            if (rest) editorRef.current.commands.insertContent(rest, { contentType: "markdown" });
          } else {
            editorRef.current.commands.insertContent(text, { contentType: "markdown" });
          }
          return true;
        }
        return false;
      },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []);
        const imgFile = files.find((f) => f.type.startsWith("image/"));
        if (!imgFile) return false;
        event.preventDefault();
        void insertImageFile(imgFile);
        return true;
      },
    },
    onUpdate: ({ editor: e }) => {
      const md = e.getMarkdown();
      setContent(md);
      setInTable(e.isActive("table"));
      save(md);
    },
    onSelectionUpdate: ({ editor: e }) => {
      setInTable(e.isActive("table"));
      const { from, to, empty } = e.state.selection;
      if (empty || !canvasRef.current) {
        setBubble(null);
        return;
      }
      const selected = e.state.doc.textBetween(from, to, " ").trim();
      if (selected.length < 2) {
        setBubble(null);
        return;
      }
      try {
        const start = e.view.coordsAtPos(from);
        const end = e.view.coordsAtPos(to);
        const rect = canvasRef.current.getBoundingClientRect();
        const midX = (start.left + end.right) / 2 - rect.left;
        const top = Math.max(8, start.top - rect.top + canvasRef.current.scrollTop - 44);
        const left = Math.max(120, Math.min(rect.width - 120, midX));
        setBubble({ top, left, text: selected.slice(0, 500) });
      } catch {
        setBubble(null);
      }
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

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

  const dictation = useDictation(
    (spoken) => {
      if (mode === "rich" && editor) {
        editor.chain().focus().insertContent(spoken).run();
      } else {
        insertSource(spoken);
      }
    },
    () => strobiSay("Voice dictation is not supported in this browser.", "error")
  );

  async function ai(action: AiAction) {
    if (!action) return;
    setBusy(true);
    setAiPct(null);
    try {
      const before = content;
      const r = await runAiAction(action, { ...note, content }, (pct) => setAiPct(pct));
      if (r.content) {
        setBoth(r.content);
        strobiSay(r.message, "tip", { action: { label: "Undo", onClick: () => setBoth(before) } });
      } else strobiSay(r.message, "tip");
    } catch (e) {
      strobiSay(e instanceof Error ? e.message : "AI failed", "error");
    }
    setAiPct(null);
    setBusy(false);
  }

  const handleExport = async (kind: string) => {
    if (!kind) return;
    if (kind === "print") {
      clearTimeout(timer.current);
      await notesRepo.update(note.id, { content });
      onPrint("modern");
    } else {
      await exportNote({ ...note, content }, kind as "md" | "html" | "txt");
    }
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

  const commitTag = () => {
    const clean = tagDraft.trim().replace(/^#/, "");
    if (clean && !note.tags.includes(clean)) {
      void notesRepo.update(note.id, { tags: [...note.tags, clean] });
    }
    setTagDraft("");
    setAddingTag(false);
  };

  const jumpToHeading = (h: { text: string; idx: number }) => {
    if (mode === "source" && src.current) {
      src.current.focus();
      src.current.setSelectionRange(h.idx, h.idx + h.text.length);
      return;
    }
    const container = canvasRef.current;
    if (!container) return;
    const nodes = container.querySelectorAll("h1, h2, h3");
    for (const el of nodes) {
      if ((el.textContent ?? "").trim() === h.text) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
      }
    }
  };

  const regenerateQuestion = async () => {
    if (quizBusy) return;
    setQuizBusy(true);
    try {
      const body = content.trim().slice(0, 4000) || note.title;
      const q = await askAI(
        `Write ONE concise, thought-provoking active-recall study question based on this note. Reply with just the question.\n\nTitle: ${note.title}\n${body}`,
        "You are a concise study coach."
      );
      if (q.trim()) setStudyQuestion(q.trim());
    } catch {
      setStudyQuestion(generateLocalStudyQuestion(note.title, content));
      strobiSay("Generated a concept question locally with NLP.", "tip");
    }
    setQuizBusy(false);
  };

  const insertQuestionIntoNote = () => {
    const block = `\n\n> **Study Question:** ${studyQuestion}\n\n`;
    if (mode === "rich" && editor) {
      editor.chain().focus().insertContent(block).run();
    } else {
      setBoth(content + block);
    }
    strobiSay("Question inserted into note", "tip");
  };

  const rewriteSelection = async () => {
    if (!editor || !bubble || rewriting) return;
    setRewriting(true);
    const { from, to } = editor.state.selection;
    const before = content;
    try {
      const res = await askAI(
        `Rewrite this excerpt to be clearer, sharper, and easier to study. Return ONLY the rewritten text:\n\n"${bubble.text}"`,
        "You are a concise editor."
      );
      if (res.trim()) {
        editor.chain().focus().insertContentAt({ from, to }, res.trim()).run();
        setBubble(null);
        strobiSay("Selection rewritten", "tip", { action: { label: "Undo", onClick: () => setBoth(before) } });
      }
    } catch {
      try {
        const polished =
          bubble.text.trim().length >= 60
            ? await summarizeWithLocalAi(bubble.text)
            : bubble.text.replace(/\s+/g, " ").trim().replace(/^[a-z]/, (ch) => ch.toUpperCase());
        if (polished.trim()) {
          editor.chain().focus().insertContentAt({ from, to }, polished.trim()).run();
          setBubble(null);
          strobiSay("Selection polished (Local AI)", "tip", { action: { label: "Undo", onClick: () => setBoth(before) } });
        }
      } catch {
        strobiSay("Could not rewrite selection locally.", "error");
      }
    }
    setRewriting(false);
  };

  const applySelectionLink = () => {
    if (!editor || !bubble) return;
    const url = window.prompt("Enter link URL:", "https://");
    if (!url || !url.trim()) return;
    const { from, to } = editor.state.selection;
    editor.chain().focus().insertContentAt({ from, to }, `[${bubble.text}](${url.trim()})`).run();
    setBubble(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2">
      {/* Breadcrumb + Back to Notes Hub */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <nav aria-label="Note breadcrumb" className="flex items-center gap-1.5 text-[11px] font-bold text-muted min-w-0 truncate">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-0.5 text-[11px] font-extrabold text-fg hover:border-border-strong transition shrink-0"
            >
              <ArrowLeft size={12} weight="bold" /> All notes
            </button>
          )}
          {!onBack && <span>Notes</span>}
          <CaretRight size={11} className="shrink-0 opacity-60" />
          <span className="truncate max-w-28">{folderName ?? "All notes"}</span>
          <CaretRight size={11} className="shrink-0 opacity-60" />
          <span className="truncate text-fg">{note.title || "Untitled note"}</span>
        </nav>
        {setDock && (
          <div className="hidden lg:flex items-center gap-1 shrink-0" role="group" aria-label="Side dock">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted mr-1">Dock</span>
            {(
              [
                { id: "whiteboard", label: "Board" },
                { id: "reference", label: "PDF / Media / URL" },
              ] as const
            ).map((d) => {
              const active = dock === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDock(active ? "" : d.id)}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition ${
                    active
                      ? "border-border-strong bg-surface-inverse text-on-inverse"
                      : "border-line bg-surface text-muted hover:border-border-strong hover:text-fg"
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Editorial Title + Mode Switcher */}
      <div className="flex items-center justify-between gap-3 shrink-0">
        <input
          className="min-w-0 flex-1 bg-transparent font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-fg outline-none placeholder:text-muted"
          aria-label="Note title"
          placeholder="Untitled note"
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

      {/* Compact Metadata Strip: Edited date + Inline Tags */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted pb-1 shrink-0">
        <span className="inline-flex items-center gap-1.5 font-medium num">
          <Clock size={13} />
          Edited {format(note.updatedAt, "d MMM, HH:mm")}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <Tag size={13} />
          {note.tags.map((t) => (
            <button
              key={t}
              type="button"
              title="Click to remove tag"
              onClick={() => void notesRepo.update(note.id, { tags: note.tags.filter((x) => x !== t) })}
              className="rounded-full bg-[var(--domain-notes-tint)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--domain-notes-text)] hover:opacity-75 transition"
            >
              #{t} ×
            </button>
          ))}
          {addingTag ? (
            <input
              autoFocus
              className="w-24 rounded-full border border-border-strong bg-surface px-2.5 py-0.5 text-[11px] font-bold text-fg outline-none"
              placeholder="tag..."
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onBlur={commitTag}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commitTag(); }
                if (e.key === "Escape") { setTagDraft(""); setAddingTag(false); }
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAddingTag(true)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-2 py-0.5 text-[11px] font-bold text-muted hover:border-border-strong hover:text-fg transition"
            >
              <Plus size={10} weight="bold" /> Add tag
            </button>
          )}
          {suggestedTags.map((st) => (
            <button
              key={st}
              type="button"
              title="Suggested tag from note content"
              onClick={() => void notesRepo.update(note.id, { tags: [...note.tags, st] })}
              className="rounded-full border border-dashed border-border-strong/30 bg-surface px-2 py-0.5 text-[10px] font-bold text-muted hover:border-border-strong hover:text-fg transition"
            >
              + #{st}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-line/40 pb-1.5 shrink-0">
        <div className="flex items-center gap-0.5 flex-wrap">
          {mode === "rich" && editor && (
            <>
              {tb("Undo", <ArrowUUpLeft size={16} />, () => c?.undo().run())}
              {tb("Redo", <ArrowUUpRight size={16} />, () => c?.redo().run())}
              <span className="mx-1 h-4 w-px bg-line/30" />
              {tb("Bold", <TextB size={16} weight="bold" />, () => c?.toggleBold().run(), editor.isActive("bold"))}
              {tb("Italic", <TextItalic size={16} />, () => c?.toggleItalic().run(), editor.isActive("italic"))}
              {tb("Highlight", <Highlighter size={16} />, () => c?.toggleHighlight().run(), editor.isActive("highlight"))}
              {tb("Link", <LinkIcon size={16} />, () => {
                if (editor.isActive("link")) {
                  c?.unsetLink().run();
                  return;
                }
                const url = window.prompt("Enter URL (https://...)");
                if (url?.trim()) c?.setLink({ href: url.trim() }).run();
              }, editor.isActive("link"))}
              {tb("Heading", <TextHTwo size={16} />, () => c?.toggleHeading({ level: 2 }).run(), editor.isActive("heading"))}
              {tb("Bullet list", <ListBullets size={16} />, () => c?.toggleBulletList().run(), editor.isActive("bulletList"))}
              {tb("Task list", <ListChecks size={16} />, () => c?.toggleTaskList().run(), editor.isActive("taskList"))}
              {tb("Quote", <Quotes size={16} />, () => c?.toggleBlockquote().run(), editor.isActive("blockquote"))}
              {tb("Code block", <Code size={16} />, () => c?.toggleCodeBlock().run(), editor.isActive("codeBlock"))}
              {tb("Table", <TableIcon size={16} />, () => c?.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}
              {tb("Comparison table", <Columns size={16} />, () => c?.insertContent("<table><thead><tr><th>Feature</th><th>Option A</th><th>Option B</th></tr></thead><tbody><tr><td>Summary</td><td></td><td></td></tr><tr><td>Pros</td><td></td><td></td></tr><tr><td>Cons</td><td></td><td></td></tr></tbody></table><p></p>").run())}
            </>
          )}
          <label
            aria-label="Insert image"
            title="Insert image"
            className="grid size-8 cursor-pointer place-items-center rounded-full text-muted transition hover:bg-soft hover:text-fg"
          >
            <ImageIcon size={16} />
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void insertImageFile(f);
                e.target.value = "";
              }}
            />
          </label>
          {tb(
            dictation.listening ? "Stop dictation" : "Voice dictation",
            dictation.listening ? <MicrophoneSlash size={16} weight="fill" /> : <Microphone size={16} />,
            dictation.toggle,
            dictation.listening
          )}
          {tb("Math palette", <FunctionIcon size={16} weight="bold" />, () => setShowMath((v) => !v), showMath || mode === "source")}
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
              <option value="">
                {busy
                  ? aiPct !== null && aiPct < 100
                    ? `Downloading local AI… ${aiPct}%`
                    : "Thinking..."
                  : "AI actions"}
              </option>
              {AI_ACTIONS.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
            <MagicWand size={13} className="pointer-events-none absolute right-2 text-violet" aria-hidden />
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <label
            aria-label="Import HTML or Markdown into note"
            title="Import .html or .md into this note"
            className="chip !min-h-7 cursor-pointer !px-2.5 text-xs font-bold bg-surface hover:border-ink inline-flex items-center gap-1"
          >
            <UploadSimple size={13} weight="bold" />
            <span className="hidden xl:inline">Import HTML</span>
            <input
              type="file"
              hidden
              accept=".html,.htm,.md,.markdown,.txt"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) {
                  strobiSay("File is too large (5 MB max).", "error");
                  return;
                }
                const raw = await file.text();
                const isHtml = /\.(html?|xhtml)$/i.test(file.name);
                const imported = isHtml ? htmlToStudyMarkdown(raw, note.title).markdown : raw;
                if (!imported.trim()) {
                  strobiSay("That file has no readable text content.", "warning");
                  return;
                }
                if (mode === "rich" && editor) {
                  editor.chain().focus().insertContent(imported, { contentType: "markdown" }).run();
                } else {
                  insertSource(`\n${imported}\n`);
                }
                strobiSay(`Imported ${file.name}`, "tip");
              }}
            />
          </label>
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
              <option value="">Export</option>
              <option value="exp:md">Export Markdown (.md)</option>
              <option value="exp:html">Export HTML (.html)</option>
              <option value="exp:txt">Export Text (.txt)</option>
              <option value="exp:print">Print / PDF</option>
            </select>
            <CaretDown size={12} className="pointer-events-none absolute right-2.5 text-muted" />
          </div>
        </div>
      </div>

      {mode === "rich" && inTable && (
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 shrink-0" aria-label="Table controls">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted mr-1 shrink-0">Table</span>
          <button type="button" onClick={() => c?.addRowAfter().run()} className="chip !min-h-6 shrink-0 !px-2.5 text-[11px] font-bold bg-surface/80 hover:bg-[var(--domain-notes-tint)]">
            + Row
          </button>
          <button type="button" onClick={() => c?.deleteRow().run()} className="chip !min-h-6 shrink-0 !px-2.5 text-[11px] font-bold bg-surface/80 hover:bg-[var(--domain-notes-tint)]">
            - Row
          </button>
          <button type="button" onClick={() => c?.addColumnAfter().run()} className="chip !min-h-6 shrink-0 !px-2.5 text-[11px] font-bold bg-surface/80 hover:bg-[var(--domain-notes-tint)]">
            + Col
          </button>
          <button type="button" onClick={() => c?.deleteColumn().run()} className="chip !min-h-6 shrink-0 !px-2.5 text-[11px] font-bold bg-surface/80 hover:bg-[var(--domain-notes-tint)]">
            - Col
          </button>
          <button
            type="button"
            onClick={() => c?.deleteTable().run()}
            className="chip !min-h-6 shrink-0 !px-2.5 text-[11px] font-bold bg-surface/80 text-coral hover:bg-coral/10 inline-flex items-center gap-1"
          >
            <Trash size={11} /> Delete table
          </button>
        </div>
      )}

      {(mode === "rich" ? toc.length > 0 : headings.length > 0) && (
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 shrink-0" aria-label="Heading outline">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted mr-1 shrink-0">Outline</span>
          {mode === "rich"
            ? toc.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    editor?.chain().setTextSelection(item.pos).focus().run();
                    item.dom?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  className={`chip !min-h-6 shrink-0 !px-2.5 text-[11px] font-bold hover:bg-[var(--domain-notes-tint)] ${
                    item.isActive ? "bg-[var(--domain-notes-tint)] text-[var(--domain-notes-text)]" : "bg-surface/80"
                  }`}
                >
                  <span className="opacity-55 mr-1">H{item.level}</span>
                  <span className="truncate max-w-36">{item.textContent}</span>
                </button>
              ))
            : headings.map((h, i) => (
                <button
                  key={`${h.idx}-${i}`}
                  type="button"
                  onClick={() => jumpToHeading(h)}
                  className="chip !min-h-6 shrink-0 !px-2.5 text-[11px] font-bold bg-surface/80 hover:bg-[var(--domain-notes-tint)]"
                >
                  <span className="opacity-55 mr-1">H{h.level}</span>
                  <span className="truncate max-w-36">{h.text}</span>
                </button>
              ))}
        </div>
      )}

      {(showMath || mode === "source") && mode !== "preview" && (
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 shrink-0" aria-label="Math symbols">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted mr-1 shrink-0">Math</span>
          {MATH_PALETTE.map((m) => (
            <button
              key={m.hint}
              type="button"
              title={`${m.hint} ($${m.latex}$)`}
              className="chip !min-h-7 shrink-0 font-mono text-[11px] hover:bg-[var(--domain-notes-tint)]"
              onClick={() => {
                if (mode === "rich" && editor) {
                  editor.chain().focus().insertContent(`$${m.latex}$ `).run();
                } else {
                  insertSource(`$${m.latex}$`);
                }
              }}
            >
              <span className="font-sans font-bold mr-1">{m.label}</span>
              <span className="opacity-65 text-[10px]">{m.hint}</span>
            </button>
          ))}
        </div>
      )}

      <div
        ref={canvasRef}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setSpellMenu(null);
            setBubble(null);
          }
        }}
        className="relative scroll-thin min-h-0 flex-1 overflow-y-auto rounded-[24px] border-[1.5px] border-line bg-surface text-fg px-6 sm:px-10 py-5 shadow-2xs transition focus-within:border-border-strong"
      >
        {mode === "rich" && editor && bubble && (
          <div
            style={{ top: bubble.top, left: bubble.left, transform: "translateX(-50%)" }}
            className="animate-in fade-in zoom-in-95 duration-150 absolute z-30 flex items-center gap-1 rounded-full border border-border-strong bg-surface-inverse px-2 py-1 text-on-inverse shadow-lg"
            role="toolbar"
            aria-label="Selection formatting"
          >
            <button
              type="button"
              aria-label="Bubble bold"
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
              className={`grid size-7 place-items-center rounded-full text-xs transition ${editor.isActive("bold") ? "bg-primary text-on-primary" : "hover:bg-surface/15"}`}
            >
              <TextB size={14} weight="bold" />
            </button>
            <button
              type="button"
              aria-label="Bubble italic"
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
              className={`grid size-7 place-items-center rounded-full text-xs transition ${editor.isActive("italic") ? "bg-primary text-on-primary" : "hover:bg-surface/15"}`}
            >
              <TextItalic size={14} />
            </button>
            <button
              type="button"
              aria-label="Bubble link"
              onMouseDown={(e) => { e.preventDefault(); applySelectionLink(); }}
              className="grid size-7 place-items-center rounded-full text-xs hover:bg-surface/15 transition"
            >
              <LinkIcon size={14} />
            </button>
            <span className="mx-0.5 h-4 w-px bg-surface/20" />
            <button
              type="button"
              disabled={rewriting}
              onMouseDown={(e) => { e.preventDefault(); void rewriteSelection(); }}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-extrabold text-on-primary hover:opacity-90 disabled:opacity-50"
            >
              <Sparkle size={12} weight="fill" /> {rewriting ? "Rewriting..." : "AI Rewrite"}
            </button>
          </div>
        )}

        {mode === "rich" && editor && spellMenu && (
          <div
            style={{ top: spellMenu.top, left: spellMenu.left, transform: "translateX(-50%)" }}
            className="animate-in fade-in zoom-in-95 duration-150 absolute z-30 flex flex-wrap items-center gap-1 rounded-2xl border border-border-strong bg-surface-inverse p-1.5 text-on-inverse shadow-xl max-w-xs"
            role="listbox"
            aria-label="Spelling suggestions"
          >
            {spellMenu.suggestions.length > 0 ? (
              spellMenu.suggestions.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    editor.chain().focus().insertContentAt({ from: spellMenu.from, to: spellMenu.to }, sug).run();
                    setSpellMenu(null);
                  }}
                  className="rounded-xl bg-primary px-2.5 py-1 text-xs font-extrabold text-on-primary hover:opacity-90 transition"
                >
                  {sug}
                </button>
              ))
            ) : (
              <span className="px-2 py-1 text-[11px] opacity-75">No suggestions</span>
            )}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                ignoreSpellWord(spellMenu.word);
                editor.view.dispatch(editor.view.state.tr.setMeta(SPELLCHECK_META, true));
                setSpellMenu(null);
              }}
              className="rounded-xl bg-surface/15 px-2.5 py-1 text-[11px] font-bold hover:bg-surface/25 transition"
            >
              Ignore
            </button>
            <button
              type="button"
              aria-label="Close spelling suggestions"
              onMouseDown={(e) => {
                e.preventDefault();
                setSpellMenu(null);
              }}
              className="grid size-6 place-items-center rounded-full hover:bg-surface/15"
            >
              <X size={11} weight="bold" />
            </button>
          </div>
        )}

        <div className="mx-auto flex min-h-full max-w-[72ch] flex-col justify-between gap-6">
          <div className="flex-1">
            {mode === "rich" && <EditorContent editor={editor} className="min-h-[180px]" />}
            {mode === "source" && (
              <textarea
                ref={src}
                aria-label="Markdown source"
                spellCheck={false}
                className="min-h-[240px] h-full w-full resize-none bg-transparent font-mono text-sm outline-none"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  save(e.target.value);
                }}
              />
            )}
            {mode === "preview" && <MarkdownView source={content} />}
          </div>

          {showQuizCard && (
            <div className="rounded-2xl border border-line/40 bg-[var(--domain-notes-tint)]/45 p-3.5 text-ink shrink-0">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--domain-notes-tint)] px-2.5 py-0.5 text-[11px] font-extrabold text-[var(--domain-notes-text)]">
                  <Sparkle size={12} weight="fill" /> Test yourself on this note
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={insertQuestionIntoNote}
                    className="rounded-full border border-line/50 bg-surface px-2.5 py-0.5 text-[11px] font-bold text-fg hover:border-border-strong transition"
                  >
                    Insert into note
                  </button>
                  <button
                    type="button"
                    disabled={quizBusy}
                    onClick={() => void regenerateQuestion()}
                    aria-label="Regenerate study question"
                    title="Regenerate question"
                    className="grid size-7 place-items-center rounded-full border border-line/50 bg-surface text-fg hover:border-border-strong transition disabled:opacity-40"
                  >
                    <ArrowsClockwise size={13} className={quizBusy ? "animate-spin" : ""} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQuizCard(false)}
                    aria-label="Hide study question card"
                    className="grid size-7 place-items-center rounded-full text-muted hover:text-fg"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
              <p className="text-xs font-semibold leading-relaxed text-fg/90">{studyQuestion}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted px-1 shrink-0">
        <span className="num">{words} words · ~{Math.max(1, Math.ceil(words / 200))} min read · autosaved locally</span>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--domain-notes-text)]">
            <Sparkle size={12} weight="fill" /> AI:
          </span>
          {AI_ACTIONS.slice(0, 3).map((a) => (
            <button
              key={a.id}
              type="button"
              disabled={busy}
              onClick={() => void ai(a.id)}
              className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-[11px] font-bold text-fg hover:border-border-strong hover:bg-[var(--domain-notes-tint)] transition disabled:opacity-40"
            >
              {a.label}
            </button>
          ))}
        </div>
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
