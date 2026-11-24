"use client";
import { useVirtualizer } from "@tanstack/react-virtual";
import dynamic from "next/dynamic";
import { useQueryState } from "nuqs";
import { useMemo, useRef, useState } from "react";
import { FolderSimple, PushPin, Trash, UploadSimple, Plus } from "@phosphor-icons/react";
import { Panels } from "@/components/shell/Panels";
import { BentoCard } from "@/components/shell/BentoCard";
import { Empty, PageFrame, Skeleton } from "@/components/ui/misc";
import { Select } from "@/components/ui/fields";
import { Modal } from "@/components/ui/modal";
import { emit } from "@/core/events";
import { foldersRepo, notesRepo } from "@/core/repos";
import { deleteWithUndo, useRows } from "@/features/shared/hooks";
import { MarkdownView } from "@/lib/MarkdownView";
import { useIsDesktop } from "@/components/ui/useMedia";
import { importMarkdownFiles } from "./noteActions";
import { NoteEditor } from "./NoteEditor";
import { format } from "date-fns";

const Whiteboard = dynamic(() => import("@/features/whiteboard/WhiteboardPage").then((m) => m.WhiteboardPage), { ssr: false });
const CodeDock = dynamic(() => import("@/features/code/CodePage").then((m) => m.CodePage), { ssr: false });
const ReaderDock = dynamic(() => import("@/features/reader/ReaderPage").then((m) => m.ReaderPage), { ssr: false });
const DOCK = { whiteboard: Whiteboard, code: CodeDock, reader: ReaderDock };

export function NotesPage() {
  const notes = useRows(notesRepo);
  const folders = useRows(foldersRepo) ?? [];
  const [id, setId] = useQueryState("id");
  const [q, setQ] = useState("");
  const [folder, setFolder] = useState("all");
  const [dock, setDock] = useState<"" | keyof typeof DOCK>("");
  const [print, setPrint] = useState({ theme: "modern" });
  const [rename, setRename] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState(false);
  const desktop = useIsDesktop();
  const fileRef = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () =>
      (notes ?? [])
        .filter(
          (n) =>
            (folder === "all" || n.folderId === folder) &&
            (n.title + n.content + n.tags.join(" ")).toLowerCase().includes(q.toLowerCase())
        )
        .sort((a, b) => Number(b.pinned ?? 0) - Number(a.pinned ?? 0) || b.updatedAt - a.updatedAt),
    [notes, q, folder]
  );

  const virt = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => list.current,
    estimateSize: () => 64,
    overscan: 6,
  });

  if (!notes) {
    return (
      <PageFrame title="Notes" subtitle="Loading your notebook...">
        <Skeleton className="flex-1 rounded-[32px]" />
      </PageFrame>
    );
  }

  const current = notes.find((n) => n.id === id);
  const create = async () => {
    const n = await notesRepo.add({
      title: "Untitled note",
      content: "",
      tags: [],
      folderId: folder === "all" ? null : folder,
    });
    emit("note.created", { title: n.title });
    void setId(n.id);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const nid = await importMarkdownFiles(e.dataTransfer.files);
    if (nid) void setId(nid);
  };

  const printNow = (theme: string) => {
    setPrint({ theme });
    setTimeout(() => window.print(), 150);
  };

  const Dock = dock ? DOCK[dock] : null;

  const catalog = (
    <BentoCard
      title="Notes"
      subtitle={`${filtered.length} total`}
      className="h-full gap-2"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => void onDrop(e)}
    >
      <div className="flex gap-1.5 shrink-0">
        <input
          className="input !min-h-9 text-xs"
          placeholder="Search notes..."
          aria-label="Search notes"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          className="btn btn-lime btn-icon size-9 shrink-0"
          aria-label="New note"
          onClick={() => void create()}
        >
          <Plus size={18} weight="bold" />
        </button>
        <button
          className="btn btn-icon size-9 shrink-0"
          aria-label="Import markdown"
          onClick={() => fileRef.current?.click()}
        >
          <UploadSimple size={18} weight="bold" />
        </button>
        <input
          ref={fileRef}
          type="file"
          hidden
          multiple
          accept=".md,.markdown,.txt"
          onChange={async (e) => {
            if (e.target.files) {
              const nid = await importMarkdownFiles(e.target.files);
              if (nid) void setId(nid);
              e.target.value = "";
            }
          }}
        />
      </div>

      <div className="flex gap-1.5 shrink-0">
        <Select
          value={folder}
          onChange={setFolder}
          options={[{ value: "all", label: "All folders" }, ...folders.map((f) => ({ value: f.id, label: f.name }))]}
        />
        <button
          className="btn btn-icon size-9 shrink-0"
          aria-label="New folder"
          onClick={() => setNewFolder(true)}
        >
          <FolderSimple size={16} />
        </button>
      </div>

      <div ref={list} className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <Empty
            title="No notes here"
            hint="Create one or drop a .md file."
            action={<button className="btn btn-lime btn-sm" onClick={() => void create()}>New note</button>}
          />
        ) : (
          <div style={{ height: virt.getTotalSize(), position: "relative" }}>
            {virt.getVirtualItems().map((v) => {
              const n = filtered[v.index];
              return (
                <div
                  key={n.id}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: v.size,
                    transform: `translateY(${v.start}px)`,
                  }}
                  className="pb-1.5"
                >
                  <div
                    className={`tile flex h-full items-center gap-2 border-[1.5px] p-2 transition hover:bg-soft ${
                      n.id === id ? "border-ink bg-lime text-ink shadow-xs" : "border-transparent"
                    }`}
                  >
                    <button className="min-w-0 flex-1 text-left" onClick={() => void setId(n.id)}>
                      <p className="truncate text-xs sm:text-sm font-bold">{n.title || "Untitled"}</p>
                      <p className="num truncate text-[11px] opacity-70">
                        {format(n.updatedAt, "d MMM, HH:mm")}
                        {n.tags.length ? ` · #${n.tags[0]}` : ""}
                      </p>
                    </button>
                    <button
                      aria-label={n.pinned ? "Unpin" : "Pin"}
                      onClick={() => void notesRepo.update(n.id, { pinned: !n.pinned })}
                      className="p-1 hover:text-ink"
                    >
                      <PushPin size={14} weight={n.pinned ? "fill" : "regular"} />
                    </button>
                    <button
                      aria-label="Rename"
                      className="text-xs font-bold p-1 hover:text-ink"
                      onClick={() => setRename(n.id)}
                    >
                      Aa
                    </button>
                    <button
                      aria-label="Delete note"
                      onClick={() => {
                        if (id === n.id) void setId(null);
                        void deleteWithUndo(notesRepo, n.id, "note");
                      }}
                      className="p-1 hover:text-ink"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </BentoCard>
  );

  const editor = (
    <BentoCard className="h-full">
      {current ? (
        <NoteEditor
          key={current.id}
          note={current}
          onPrint={printNow}
          dock={dock}
          setDock={(v) => setDock(v as typeof dock)}
        />
      ) : (
        <Empty
          title="Pick a note or start writing"
          hint="Rich text, Markdown source, KaTeX and Mermaid all live here."
          action={<button className="btn btn-lime" onClick={() => void create()}>New note</button>}
          mood="happy"
        />
      )}
    </BentoCard>
  );

  const dockPanel = Dock ? (
    <BentoCard className="overflow-hidden !p-0">
      <Dock />
    </BentoCard>
  ) : null;

  return (
    <PageFrame title="Notes" subtitle="Write rich or raw. Autosaves locally.">
      <Panels
        className="lg:grid-cols-12"
        panels={[
          { id: "catalog", label: "Catalog", className: "lg:col-span-4", node: catalog },
          {
            id: "editor",
            label: "Editor",
            className: dockPanel && desktop ? "lg:col-span-4" : "lg:col-span-8",
            node: editor,
          },
          ...(dockPanel && desktop
            ? [{ id: "dock", label: "Dock", className: "lg:col-span-4", node: dockPanel }]
            : []),
        ]}
      />

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
