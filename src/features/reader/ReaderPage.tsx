"use client";
import { useEffect, useRef, useState } from "react";
import { FileArrowUp, Pause, Play, SpeakerHigh } from "@phosphor-icons/react";
import { Panels } from "@/components/shell/Panels";
import { Card, CardTitle, Empty, PageFrame, Segmented } from "@/components/ui/misc";
import { strobiSay } from "@/features/strobi/toast";
import { bionic, docxToHtml, epubText, pdfText, renderPdf, sheetRows } from "./docUtils";
import { StudioTools } from "./StudioTools";

type Doc = { name: string; kind: "pdf" | "docx" | "sheet" | "text" | "pptx"; text: string; html?: string; rows?: string[][]; buf?: ArrayBuffer };
export function ReaderPage() {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [mode, setMode] = useState<"page" | "text">("page");
  const [bio, setBio] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [tts, setTts] = useState({ rate: 1, pitch: 1, voice: "" });
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => { const l = () => setVoices(window.speechSynthesis?.getVoices() ?? []); l(); window.speechSynthesis?.addEventListener?.("voiceschanged", l); return () => { window.speechSynthesis?.cancel(); }; }, []);
  useEffect(() => { if (doc?.kind === "pdf" && doc.buf && mode === "page" && host.current) void renderPdf(doc.buf, host.current).catch(() => strobiSay("Could not render that PDF.", "error")); }, [doc, mode]);

  async function open(f: File) {
    try {
      const n = f.name.toLowerCase();
      if (n.endsWith(".pdf")) { const buf = await f.arrayBuffer(); setMode("page"); setDoc({ name: f.name, kind: "pdf", buf, text: await pdfText(buf) }); }
      else if (n.endsWith(".docx")) { const r = await docxToHtml(await f.arrayBuffer()); setDoc({ name: f.name, kind: "docx", html: r.html, text: r.text }); }
      else if (/\.(xlsx|xls|csv)$/.test(n)) setDoc({ name: f.name, kind: "sheet", rows: await sheetRows(f), text: "" });
      else if (n.endsWith(".epub")) setDoc({ name: f.name, kind: "text", text: await epubText(await f.arrayBuffer()) });
      else if (n.endsWith(".pptx")) setDoc({ name: f.name, kind: "pptx", text: "" });
      else setDoc({ name: f.name, kind: "text", text: await f.text() });
    } catch { strobiSay("That file could not be opened.", "error"); }
  }
  const speak = () => {
    const s = window.speechSynthesis;
    if (!s || !doc?.text) return strobiSay("Speech is not supported in this browser.", "error");
    if (speaking) { s.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(doc.text.slice(0, 20000));
    u.rate = tts.rate; u.pitch = tts.pitch; const v = voices.find((x) => x.name === tts.voice); if (v) u.voice = v;
    u.onend = () => setSpeaking(false); s.speak(u); setSpeaking(true);
  };
  const textView = doc && (bio ? <p className="prose-sq whitespace-pre-wrap">{bionic(doc.text).map((w, i) => <span key={i}><b>{w.b}</b>{w.r}</span>)}</p> : <p className="prose-sq whitespace-pre-wrap">{doc.text}</p>);
  const viewer = (
    <Card className="gap-3">
      <CardTitle sub={doc?.name ?? "PDF, DOCX, XLSX, CSV, TXT, EPUB"} right={<label className="btn btn-lime btn-sm cursor-pointer"><FileArrowUp size={16} weight="bold" />Open<input type="file" hidden accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md,.epub,.pptx" onChange={(e) => { const f = e.target.files?.[0]; if (f) void open(f); e.target.value = ""; }} /></label>}>Reader</CardTitle>
      {doc && (doc.kind === "pdf" || doc.kind === "docx" || doc.kind === "text") && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {doc.kind === "pdf" && <Segmented value={mode} onChange={setMode} options={[{ value: "page", label: "Pages" }, { value: "text", label: "Text" }]} />}
          <button className={`chip ${bio ? "bg-lime text-ink" : ""}`} aria-pressed={bio} onClick={() => { setBio(!bio); if (doc.kind === "pdf") setMode("text"); }}>Bionic reading</button>
          <button className="chip" onClick={speak}>{speaking ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" />}{speaking ? "Stop" : "Read aloud"}</button>
          <label className="flex items-center gap-1"><SpeakerHigh size={14} aria-hidden /><span className="sr-only">Speed</span><input type="range" min={0.5} max={2} step={0.1} value={tts.rate} onChange={(e) => setTts({ ...tts, rate: +e.target.value })} aria-label="Speech speed" className="w-20 accent-ink" /></label>
          <input type="range" min={0.5} max={2} step={0.1} value={tts.pitch} onChange={(e) => setTts({ ...tts, pitch: +e.target.value })} aria-label="Speech pitch" className="w-20 accent-ink" />
          {voices.length > 0 && <select aria-label="Voice" className="input !min-h-8 max-w-40 !text-xs" value={tts.voice} onChange={(e) => setTts({ ...tts, voice: e.target.value })}><option value="">Default voice</option>{voices.map((v) => <option key={v.name}>{v.name}</option>)}</select>}
        </div>
      )}
      <div className="scroll-thin min-h-0 flex-1 rounded-[24px] bg-soft p-3">
        {!doc && <Empty title="Open a document" hint="Everything is parsed on your device. Nothing uploads." mood="happy" />}
        {doc?.kind === "pdf" && (mode === "page" ? <div ref={host} className="flex flex-col items-center" /> : textView)}
        {doc?.kind === "docx" && (bio ? textView : <div className="prose-sq" dangerouslySetInnerHTML={{ __html: doc.html ?? "" }} />)}
        {doc?.kind === "text" && textView}
        {doc?.kind === "pptx" && <Empty title="PowerPoint preview is not available" hint="PPTX rendering is not supported yet. Export slides to PDF to read them here." mood="thinking" />}
        {doc?.kind === "sheet" && doc.rows && <table className="w-full text-left text-xs"><tbody>{doc.rows.map((r, i) => <tr key={i} className={i === 0 ? "font-bold" : "border-t border-line/10"}>{r.map((c, j) => <td key={j} className="num px-2 py-1">{c}</td>)}</tr>)}</tbody></table>}
      </div>
    </Card>
  );
  return (
    <PageFrame title="Reader" subtitle="Read, listen, and edit documents without leaving the app.">
      <Panels className="lg:grid-cols-12" panels={[{ id: "view", label: "Reader", className: "lg:col-span-7", node: viewer }, { id: "studio", label: "Studio", className: "lg:col-span-5", node: <StudioTools /> }]} />
    </PageFrame>
  );
}
