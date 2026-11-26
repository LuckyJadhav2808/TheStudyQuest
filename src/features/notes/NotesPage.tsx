"use client";
import dynamic from "next/dynamic";
import MiniSearch from "minisearch";
import { useQueryState } from "nuqs";
import { useEffect, useMemo, useRef, useState } from "react";
import { format, startOfDay, subDays } from "date-fns";
import { Group, Panel, Separator } from "react-resizable-panels";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Cards, Clock, FileText, FolderSimple, PencilSimple, Plus, PushPin, Trash, UploadSimple, X } from "@phosphor-icons/react";
import { Panels } from "@/components/shell/Panels";
import { BentoCard } from "@/components/shell/BentoCard";
import { Empty, PageFrame, Segmented, Skeleton } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { foldersRepo, notesRepo } from "@/core/repos";
import { deleteWithUndo, useRows } from "@/features/shared/hooks";
import { MarkdownView } from "@/lib/MarkdownView";
import { useIsDesktop } from "@/components/ui/useMedia";
import { importMarkdownFiles } from "./noteActions";
import { NoteEditor } from "./NoteEditor";
import { FlashcardReviewModal } from "./FlashcardReviewModal";

const Whiteboard = dynamic(() => import("./WhiteboardDock").then((m) => m.WhiteboardDock), { ssr: false });
const Reference = dynamic(() => import("./ReferenceDock").then((m) => m.ReferenceDock), { ssr: false });
const DOCK = { whiteboard: Whiteboard, reference: Reference } as const;
const DOCK_LABELS: Record<keyof typeof DOCK, string> = { whiteboard: "Board", reference: "PDF / Media / URL" };

const CARD_TINTS = [
  "bg-[var(--domain-notes-tint)]",
  "bg-[var(--domain-quests-tint)]",
  "bg-[var(--domain-tools-tint)]",
  "bg-[var(--domain-stats-tint)]",
] as const;

type TimeFilter = "all" | "today" | "week" | "earlier";

export function NotesPage() {
  const notes = useRows(notesRepo);
  const rawFolders = useRows(foldersRepo);
  const folders = useMemo(() => rawFolders ?? [], [rawFolders]);
  const [id, setId] = useQueryState("id");
  const [q, setQ] = useState("");
  const [folder, setFolder] = useState("all");
  const [folderPeriod, setFolderPeriod] = useState<"all" | "today" | "week">("all");
  const [notePeriod, setNotePeriod] = useState<TimeFilter>("all");
  const [dock, setDock] = useState<"" | keyof typeof DOCK>("");
  const [print, setPrint] = useState({ theme: "modern" });
  const [rename, setRename] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [notesGridRef] = useAutoAnimate<HTMLDivElement>();
  const desktop = useIsDesktop();
  const fileRef = useRef<HTMLInputElement>(null);

  const searchIndex = useMemo(() => {
    const ms = new MiniSearch<{ id: string; title: string; content: string; tagsText: string }>({
      fields: ["title", "content", "tagsText"],
      storeFields: ["id"],
      searchOptions: { prefix: true, fuzzy: 0.2, boost: { title: 2 } },
    });
    if (notes?.length) {
      ms.addAll(notes.map((n) => ({ id: n.id, title: n.title, content: n.content, tagsText: n.tags.join(" ") })));
    }
    return ms;
  }, [notes]);

  const filtered = useMemo(() => {
    const todayStart = startOfDay(new Date()).getTime();
    const weekStart = startOfDay(subDays(new Date(), 6)).getTime();
    const query = q.trim();
    const matchedIds = query ? new Set(searchIndex.search(query).map((r) => String(r.id))) : null;
    return (notes ?? [])
      .filter((n) => {
        if (folder !== "all" && n.folderId !== folder) return false;
        if (matchedIds && !matchedIds.has(n.id)) return false;
        if (notePeriod === "today") return n.updatedAt >= todayStart;
        if (notePeriod === "week") return n.updatedAt >= weekStart;
        if (notePeriod === "earlier") return n.updatedAt < weekStart;
        return true;
      })
      .sort((a, b) => Number(b.pinned ?? 0) - Number(a.pinned ?? 0) || b.updatedAt - a.updatedAt);
  }, [notes, q, folder, notePeriod, searchIndex]);

  const visibleFolders = useMemo(() => {
    const todayStart = startOfDay(new Date()).getTime();
    const weekStart = startOfDay(subDays(new Date(), 6)).getTime();
    return folders.filter((f) => {
      if (folderPeriod === "today") return f.updatedAt >= todayStart;
      if (folderPeriod === "week") return f.updatedAt >= weekStart;
      return true;
    });
  }, [folders, folderPeriod]);

  // Delete empty untitled notes when leaving /notes
  const notesRef = useRef(notes);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);
  useEffect(() => {
    return () => {
      const empties = (notesRef.current ?? []).filter(
        (n) => (n.title === "Untitled note" || !n.title.trim()) && !n.content.trim()
      );
      for (const n of empties) {
        void notesRepo.remove(n.id);
      }
    };
  }, []);

  if (!notes) {
    return (
      <PageFrame title="Notes" subtitle="Loading your notebook...">
        <Skeleton className="flex-1 rounded-[32px]" />
      </PageFrame>
    );
  }

  const current = notes.find((n) => n.id === id);

  const create = async () => {
    const existingEmpty = notes.find(
      (n) => (n.title === "Untitled note" || !n.title.trim()) && !n.content.trim()
    );
    if (existingEmpty) {
      void setId(existingEmpty.id);
      return;
    }
    const n = await notesRepo.add({
      title: "Untitled note",
      content: "",
      tags: [],
      folderId: folder === "all" ? null : folder,
    });
    void setId(n.id);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const nid = await importMarkdownFiles(e.dataTransfer.files);
    if (nid) void setId(nid);
  };

  const printNow = (theme: string) => {
    setPrint({ theme });
    setTimeout(async () => {
      const root = document.getElementById("print-root");
      if (root) {
        const imgs = Array.from(root.querySelectorAll("img"));
        await Promise.all(imgs.map((img) => img.decode().catch(() => undefined)));
      }
      window.print();
    }, 350);
  };

  const Dock = dock ? DOCK[dock] : null;

  const hub = (
    <BentoCard
      className="h-full"
      bodyClassName="flex min-h-0 flex-1 flex-col gap-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => void onDrop(e)}
    >
      {/* Hub Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-52 max-w-md">
          <input
            className="input !min-h-9 text-xs"
            placeholder="Search notes, tags, or content..."
            aria-label="Search notes"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {folder !== "all" && (
            <button
              type="button"
              onClick={() => setFolder("all")}
              className="chip !min-h-8 text-xs font-bold bg-[var(--domain-notes-tint)]"
            >
              Folder: {folders.find((f) => f.id === folder)?.name ?? "Selected"} ×
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm gap-1.5"
            onClick={() => fileRef.current?.click()}
          >
            <UploadSimple size={15} weight="bold" /> Import
          </button>
          <input
            ref={fileRef}
            type="file"
            hidden
            multiple
            accept=".md,.markdown,.txt,.html,.htm"
            onChange={async (e) => {
              if (e.target.files) {
                const nid = await importMarkdownFiles(e.target.files);
                if (nid) void setId(nid);
                e.target.value = "";
              }
            }}
          />
          <button
            type="button"
            className="btn btn-lime btn-sm gap-1.5"
            onClick={() => void create()}
          >
            <Plus size={15} weight="bold" /> New note
          </button>
        </div>
      </div>

      {/* Scrollable Hub Content */}
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto space-y-5 pr-1">
        {/* Recent Folders Section */}
        <section className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-base font-extrabold tracking-tight">Recent Folders</h2>
            <Segmented
              size="xs"
              ariaLabel="Filter folders by period"
              value={folderPeriod}
              onChange={setFolderPeriod}
              options={[
                { value: "all", label: "All" },
                { value: "today", label: "Today" },
                { value: "week", label: "This Week" },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {visibleFolders.map((f, idx) => {
              const count = notes.filter((n) => n.folderId === f.id).length;
              const active = folder === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFolder(active ? "all" : f.id)}
                  className={`flex flex-col justify-between rounded-2xl border-[1.5px] p-3 text-left transition ${
                    CARD_TINTS[idx % CARD_TINTS.length]
                  } ${active ? "border-border-strong ring-2 ring-primary shadow-sm" : "border-border-strong/20 hover:border-border-strong"}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="grid size-8 place-items-center rounded-xl border border-border-strong/30 bg-surface/80 text-fg">
                      <FolderSimple size={16} weight="duotone" />
                    </span>
                    <span className="pill bg-surface/80 text-[10px] font-bold num">{count}</span>
                  </div>
                  <div>
                    <p className="truncate text-sm font-extrabold text-fg">{f.name}</p>
                    <p className="text-[11px] text-muted num">{format(f.updatedAt, "d MMM yyyy")}</p>
                  </div>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setNewFolder(true)}
              className="flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-border-strong/40 bg-surface-2/60 p-3 text-xs font-bold text-muted hover:border-border-strong hover:text-fg transition"
            >
              <FolderSimple size={18} weight="duotone" />
              <span>New folder</span>
            </button>
          </div>
        </section>

        {/* My Notes Section */}
        <section className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-base font-extrabold tracking-tight">
              My Notes <span className="text-xs font-bold text-muted num ml-1">({filtered.length})</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setReviewOpen(true)}
                className="btn btn-sm gap-1.5 whitespace-nowrap"
              >
                <Cards size={14} weight="duotone" /> Flashcards (FSRS)
              </button>
              <Segmented
                size="xs"
                ariaLabel="Filter notes by period"
                value={notePeriod}
                onChange={setNotePeriod}
                options={[
                  { value: "all", label: "All" },
                  { value: "today", label: "Today" },
                  { value: "week", label: "This Week" },
                  { value: "earlier", label: "Earlier" },
                ]}
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div ref={notesGridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-line/40 bg-surface-2/50 p-4">
                <Empty
                  title="No notes match"
                  hint="Create a new note or drop a .md file anywhere here."
                  action={<button className="btn btn-lime btn-sm" onClick={() => void create()}>New note</button>}
                />
              </div>
              <button
                type="button"
                onClick={() => void create()}
                className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-border-strong/40 bg-surface-2/60 p-4 text-xs font-bold text-muted hover:border-border-strong hover:text-fg transition"
              >
                <Plus size={20} weight="bold" />
                <span>New Note</span>
              </button>
            </div>
          ) : (
            <div ref={notesGridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {filtered.map((n, idx) => (
                <div
                  key={n.id}
                  className={`group flex flex-col justify-between rounded-2xl border-[1.5px] border-border-strong/20 p-3.5 transition hover:border-border-strong hover:shadow-xs ${
                    CARD_TINTS[idx % CARD_TINTS.length]
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-bold text-muted num">
                        {format(n.updatedAt, "d MMM yyyy")}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          aria-label={n.pinned ? "Unpin" : "Pin"}
                          onClick={() => void notesRepo.update(n.id, { pinned: !n.pinned })}
                          className="grid size-6 place-items-center rounded-full hover:bg-surface/80 transition"
                        >
                          <PushPin size={13} weight={n.pinned ? "fill" : "regular"} />
                        </button>
                        <button
                          type="button"
                          aria-label="Rename note"
                          onClick={() => setRename(n.id)}
                          className="grid size-6 place-items-center rounded-full hover:bg-surface/80 transition"
                        >
                          <PencilSimple size={13} />
                        </button>
                        <button
                          type="button"
                          aria-label="Delete note"
                          onClick={() => void deleteWithUndo(notesRepo, n.id, "note")}
                          className="grid size-6 place-items-center rounded-full hover:bg-surface/80 transition"
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void setId(n.id)}
                      className="w-full text-left"
                    >
                      <h3 className="truncate text-sm font-extrabold text-fg mb-1 group-hover:underline">
                        {n.title || "Untitled note"}
                      </h3>
                      <p className="line-clamp-3 text-xs leading-relaxed text-fg/75">
                        {n.content.replace(/[#*>`-]/g, "").trim() || "Empty note — click to start writing."}
                      </p>
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-border-strong/10 pt-2 text-[11px] text-muted">
                    <span className="inline-flex items-center gap-1 num">
                      <Clock size={12} /> {format(n.updatedAt, "HH:mm")}
                    </span>
                    <div className="flex items-center gap-1 truncate">
                      {n.tags[0] ? (
                        <span className="rounded-full bg-surface/80 px-2 py-px text-[10px] font-bold text-fg">
                          #{n.tags[0]}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold">
                          <FileText size={11} /> Open
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => void create()}
                className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-border-strong/40 bg-surface-2/60 p-4 text-xs font-bold text-muted hover:border-border-strong hover:text-fg transition"
              >
                <PencilSimple size={18} weight="duotone" />
                <span>New Note</span>
              </button>
            </div>
          )}
        </section>
      </div>
    </BentoCard>
  );

  const editor = current ? (
    <BentoCard
      className="h-full"
      blob={{ preset: 1, color: "var(--color-lavender)", className: "-bottom-24 -right-20 size-96 opacity-45" }}
    >
      <NoteEditor
        key={current.id}
        note={current}
        folderName={folders.find((f) => f.id === current.folderId)?.name}
        onBack={() => {
          setDock("");
          void setId(null);
        }}
        onPrint={printNow}
        dock={dock}
        setDock={(v) => setDock(v as typeof dock)}
      />
    </BentoCard>
  ) : null;

  const dockPanel = Dock && dock ? (
    <BentoCard className="h-full overflow-hidden !p-0" bodyClassName="flex min-h-0 flex-1 flex-col !p-0">
      <div className="flex items-center justify-between gap-2 border-b border-line/40 bg-surface-2 px-3 py-2 shrink-0">
        <span className="text-xs font-extrabold tracking-tight">{DOCK_LABELS[dock]} Side Dock</span>
        <div className="flex items-center gap-1">
          {(Object.keys(DOCK) as Array<keyof typeof DOCK>).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setDock(k)}
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition ${
                dock === k ? "bg-surface-inverse text-on-inverse" : "text-muted hover:text-fg"
              }`}
            >
              {DOCK_LABELS[k]}
            </button>
          ))}
          <button
            type="button"
            aria-label="Close side dock"
            onClick={() => setDock("")}
            className="grid size-6 place-items-center rounded-full text-muted hover:bg-surface hover:text-fg transition ml-1"
          >
            <X size={13} weight="bold" />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <Dock />
      </div>
    </BentoCard>
  ) : null;

  return (
    <PageFrame title="Notes" subtitle="Write rich or raw. Type / for blocks & formulas.">
      {current && editor && dockPanel && desktop ? (
        <Group orientation="horizontal" className="min-h-0 flex-1 gap-1">
          <Panel defaultSize={60} minSize={35} className="min-h-0 flex flex-col">
            {editor}
          </Panel>
          <Separator className="w-2 rounded-full bg-line/30 hover:bg-primary/60 transition-colors cursor-col-resize" />
          <Panel defaultSize={40} minSize={25} className="min-h-0 flex flex-col">
            {dockPanel}
          </Panel>
        </Group>
      ) : (
        <Panels
          className="lg:grid-cols-12"
          panels={
            current && editor
              ? [
                  {
                    id: "editor",
                    label: "Editor",
                    className: "lg:col-span-12",
                    node: editor,
                  },
                ]
              : [{ id: "hub", label: "Notes Hub", className: "lg:col-span-12", node: hub }]
          }
        />
      )}
      <FlashcardReviewModal open={reviewOpen} onClose={() => setReviewOpen(false)} />

      <div id="print-root" className={`hidden print:block print-${print.theme}`}>
        {current && (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 800 }}>{current.title}</h1>
            <p style={{ opacity: 0.7, fontSize: 12 }}>StudyQuest · {format(Date.now(), "d MMMM yyyy")}</p>
            <MarkdownView source={current.content} />
          </>
        )}
      </div>

      <Modal open={rename !== null} onClose={() => setRename(null)} title="Rename note">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = new FormData(e.currentTarget).get("t");
            if (rename && typeof v === "string") void notesRepo.update(rename, { title: v });
            setRename(null);
          }}
        >
          <input
            name="t"
            className="input"
            autoFocus
            defaultValue={notes.find((n) => n.id === rename)?.title}
          />
          <button className="btn btn-lime" type="submit">
            Save
          </button>
        </form>
      </Modal>

      <Modal open={newFolder} onClose={() => setNewFolder(false)} title="New folder">
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const v = new FormData(e.currentTarget).get("name");
            if (typeof v === "string" && v.trim()) {
              await foldersRepo.add({ name: v.trim(), color: "var(--color-lime)" });
              setNewFolder(false);
            }
          }}
        >
          <input name="name" className="input" placeholder="Folder name" autoFocus />
          <button className="btn btn-lime" type="submit">
            Create
          </button>
        </form>
      </Modal>
    </PageFrame>
  );
}
