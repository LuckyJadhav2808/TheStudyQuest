"use client";
import { useState } from "react";
import { ArrowSquareOut, BookmarkSimple, FilePdf, GithubLogo, GoogleDriveLogo, Link as LinkIcon, NotePencil, PushPin, Plus, Trash, YoutubeLogo, type Icon } from "@phosphor-icons/react";
import { Panels } from "@/components/shell/Panels";
import { Card, CardTitle, Empty, IconBadge, PageFrame } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { Field, Select } from "@/components/ui/fields";
import { resourcesRepo } from "@/core/repos";
import type { Resource, ResourceKind } from "@/core/types";
import { deleteWithUndo, useRows } from "@/features/shared/hooks";

const KIND_ICON: Record<ResourceKind, Icon> = { link: LinkIcon, pdf: FilePdf, youtube: YoutubeLogo, drive: GoogleDriveLogo, github: GithubLogo, text: NotePencil };
const COLORS = ["#D9FF45", "#FFE2D2", "#E8E4FF", "#1FD6C1", "#FF8B4A", "#2E8BFF"];
const detect = (u: string): ResourceKind => (/youtu\.?be/.test(u) ? "youtube" : /drive\.google/.test(u) ? "drive" : /github\.com/.test(u) ? "github" : /\.pdf($|\?)/i.test(u) ? "pdf" : "link");
const ytId = (u: string): string | null => /(?:v=|youtu\.be\/|embed\/)([\w-]{11})/.exec(u)?.[1] ?? null;

export function ResourcesPage() {
  const rows = useRows(resourcesRepo) ?? [];
  const [q, setQ] = useState("");
  const [folder, setFolder] = useState("All");
  const [add, setAdd] = useState(false);
  const [view, setView] = useState<Resource | null>(null);
  const [f, setF] = useState({ title: "", url: "", folder: "General", color: COLORS[0], tags: "", text: "", kind: "auto" as ResourceKind | "auto" });
  const folders = ["All", ...new Set(rows.map((r) => r.folder))];
  const shown = rows.filter((r) => (folder === "All" || r.folder === folder) && (r.title + r.url + r.tags.join(" ")).toLowerCase().includes(q.toLowerCase())).sort((a, b) => Number(b.pinned) - Number(a.pinned));
  const submit = async (e: React.FormEvent) => { e.preventDefault(); const kind = f.kind === "auto" ? (f.text && !f.url ? "text" : detect(f.url)) : f.kind; if (!f.title.trim() && !f.url.trim()) return; await resourcesRepo.add({ title: f.title.trim() || f.url, url: f.url.trim(), kind, folder: f.folder.trim() || "General", color: f.color, pinned: false, tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean), text: f.text }); setAdd(false); setF({ ...f, title: "", url: "", text: "", tags: "" }); };
  const side = (
    <Card className="gap-2">
      <CardTitle>Folders</CardTitle>
      <div className="scroll-thin min-h-0 flex-1 space-y-1">{folders.map((x) => <button key={x} onClick={() => setFolder(x)} className={`min-h-10 w-full rounded-full px-4 text-left text-sm font-bold ${x === folder ? "bg-ink text-paper" : "hover:bg-soft"}`}>{x}</button>)}</div>
    </Card>
  );
  const grid = (
    <Card className="gap-3">
      <div className="flex gap-2"><input className="input" placeholder="Search the vault" aria-label="Search resources" value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn btn-lime shrink-0" onClick={() => setAdd(true)}><Plus size={18} weight="bold" />Add</button></div>
      <div className="scroll-thin grid min-h-0 flex-1 content-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shown.length === 0 && <div className="col-span-full"><Empty title="Your vault is empty" hint="Save links, PDFs, videos and notes you keep coming back to." action={<button className="btn btn-lime" onClick={() => setAdd(true)}>Add a resource</button>} /></div>}
        {shown.map((r) => { const Ic = KIND_ICON[r.kind]; return (
          <div key={r.id} className="tile flex flex-col gap-2 border border-line/20 bg-surface">
            <div className="flex items-start gap-3"><IconBadge color={r.color}><Ic size={22} weight="duotone" /></IconBadge><button className="min-w-0 flex-1 text-left" onClick={() => setView(r)}><p className="line-clamp-2 text-sm font-bold">{r.title}</p><p className="truncate text-xs text-muted">{r.folder}{r.tags.length ? ` · #${r.tags.join(" #")}` : ""}</p></button>
              <button aria-label={r.pinned ? "Unpin" : "Pin"} onClick={() => void resourcesRepo.update(r.id, { pinned: !r.pinned })}><PushPin size={18} weight={r.pinned ? "fill" : "regular"} /></button></div>
            <div className="flex gap-2">{r.url && <a className="btn btn-sm" href={r.url} target="_blank" rel="noreferrer"><ArrowSquareOut size={14} />Open</a>}<button className="btn btn-sm btn-icon ml-auto" aria-label="Delete resource" onClick={() => void deleteWithUndo(resourcesRepo, r.id, "resource")}><Trash size={14} /></button></div>
          </div>
        ); })}
      </div>
    </Card>
  );
  const id = view ? ytId(view.url) : null;
  return (
    <PageFrame title="Resources" subtitle="A bookmark vault for everything worth keeping.">
      <Panels className="lg:grid-cols-12" panels={[{ id: "f", label: "Folders", className: "lg:col-span-2", node: side }, { id: "g", label: "Vault", className: "lg:col-span-10", node: grid }]} />
      <Modal open={add} onClose={() => setAdd(false)} title="Add resource">
        <form className="flex flex-col gap-3" onSubmit={(e) => void submit(e)}>
          <Field label="Title"><input className="input" autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Link (leave empty for a text note)"><input className="input" type="url" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://" /></Field>
          <div className="grid grid-cols-2 gap-2"><Field label="Folder"><input className="input" value={f.folder} onChange={(e) => setF({ ...f, folder: e.target.value })} /></Field><Field label="Type"><Select value={f.kind} onChange={(v) => setF({ ...f, kind: v as typeof f.kind })} options={[{ value: "auto", label: "Detect" }, ...(Object.keys(KIND_ICON) as ResourceKind[]).map((k) => ({ value: k, label: k }))]} /></Field></div>
          <Field label="Tags (comma separated)"><input className="input" value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} /></Field>
          {!f.url && <Field label="Text"><textarea className="input" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} /></Field>}
          <div className="flex gap-2" role="radiogroup" aria-label="Colour">{COLORS.map((c) => <button type="button" key={c} role="radio" aria-checked={f.color === c} aria-label={c} onClick={() => setF({ ...f, color: c })} className="size-9 rounded-full border-2" style={{ background: c, borderColor: f.color === c ? "var(--fg)" : "transparent" }} />)}</div>
          <button className="btn btn-lime" type="submit"><BookmarkSimple size={16} weight="bold" />Save</button>
        </form>
      </Modal>
      <Modal open={view !== null} onClose={() => setView(null)} title={view?.title ?? ""} wide>
        {view && (id ? <iframe title={view.title} className="aspect-video w-full rounded-[24px]" src={`https://www.youtube.com/embed/${id}`} allow="encrypted-media; picture-in-picture" allowFullScreen /> : view.kind === "pdf" ? <iframe title={view.title} className="h-[60dvh] w-full rounded-[24px]" src={view.url} /> : view.kind === "text" ? <p className="whitespace-pre-wrap text-sm">{view.text}</p> : <p className="text-sm">This site may block embedding. <a className="font-bold underline" href={view.url} target="_blank" rel="noreferrer">Open in a new tab</a></p>)}
      </Modal>
    </PageFrame>
  );
}
