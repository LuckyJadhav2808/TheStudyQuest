"use client";
import { useEffect, useRef, useState } from "react";
import { FileArrowUp, Pause, Play, SpeakerHigh, Clock, Copy, NotePencil, Sparkle, X } from "@phosphor-icons/react";
import { Panels } from "@/components/shell/Panels";
import { HeroCard } from "@/components/ui/design-primitives";
import { Illustration } from "@/components/illustrations/Illustration";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DashedDropzone } from "@/components/ui/dropzone";
import { Empty, PageFrame, Segmented } from "@/components/ui/misc";
import { Select } from "@/components/ui/fields";
import { Slider } from "@/components/ui/slider";
import { notesRepo } from "@/core/repos";
import { askAI } from "@/lib/aiClient";
import { strobiSay } from "@/features/strobi/toast";
import { bionic, docxToHtml, epubText, pdfText, pptxText, renderPdf, renderPptx, sheetRows } from "./docUtils";
import { StudioTools } from "./StudioTools";

type Doc = { name: string; kind: "pdf" | "docx" | "sheet" | "text" | "pptx"; text: string; html?: string; rows?: string[][]; buf?: ArrayBuffer };

type ReadSurface = "paper" | "sepia" | "sky" | "ink";
const READ_SURFACE: Record<ReadSurface, { label: string; cls: string; swatch: string }> = {
  paper: { label: "Paper", cls: "bg-surface text-fg", swatch: "bg-surface text-fg" },
  sepia: { label: "Warm", cls: "bg-[var(--domain-quests-tint)] text-on-primary", swatch: "bg-[var(--domain-quests-tint)] text-on-primary" },
  sky: { label: "Sky", cls: "bg-[var(--domain-tools-tint)] text-on-primary", swatch: "bg-[var(--domain-tools-tint)] text-on-primary" },
  ink: { label: "Ink", cls: "bg-surface-inverse text-on-inverse", swatch: "bg-surface-inverse text-on-inverse" },
};

export function ReaderPage() {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [mode, setMode] = useState<"page" | "text">("page");
  const [bio, setBio] = useState(false);
  const [surface, setSurface] = useState<ReadSurface>("paper");
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg">("md");
  const [fontFamily, setFontFamily] = useState<"sans" | "serif" | "mono">("sans");
  const [lineSpacing, setLineSpacing] = useState<"tight" | "normal" | "airy">("normal");
  const [selText, setSelText] = useState("");
  const [aiExplain, setAiExplain] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [tts, setTts] = useState({ rate: 1, pitch: 1, voice: "" });
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [recent, setRecent] = useState<{ name: string; kind: string }[]>([]);
  const host = useRef<HTMLDivElement>(null);
  const pptxHost = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("sq-recent-docs");
      if (raw) setRecent(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const l = () => setVoices(window.speechSynthesis?.getVoices() ?? []);
    l();
    window.speechSynthesis?.addEventListener?.("voiceschanged", l);
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    if (doc?.kind === "pdf" && doc.buf && mode === "page" && host.current) {
      void renderPdf(doc.buf, host.current).catch(() => strobiSay("Could not render that PDF.", "error"));
    }
    if (doc?.kind === "pptx" && doc.buf && mode === "page" && pptxHost.current) {
      let destroy: (() => void) | undefined;
      void renderPptx(doc.buf, pptxHost.current)
        .then((fn) => { destroy = fn; })
        .catch(() => strobiSay("Could not preview that PPTX.", "error"));
      return () => destroy?.();
    }
  }, [doc, mode]);

  async function open(f: File) {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setSelText("");
    setAiExplain(null);
    try {
      const n = f.name.toLowerCase();
      if (n.endsWith(".pdf")) {
        const buf = await f.arrayBuffer();
        setMode("page");
        setDoc({ name: f.name, kind: "pdf", buf, text: await pdfText(buf) });
      } else if (n.endsWith(".docx")) {
        const r = await docxToHtml(await f.arrayBuffer());
        setDoc({ name: f.name, kind: "docx", html: r.html, text: r.text });
      } else if (/\.(xlsx|xls|csv)$/.test(n)) {
        setDoc({ name: f.name, kind: "sheet", rows: await sheetRows(f), text: "" });
      } else if (n.endsWith(".epub")) {
        setDoc({ name: f.name, kind: "text", text: await epubText(await f.arrayBuffer()) });
      } else if (n.endsWith(".pptx")) {
        const buf = await f.arrayBuffer();
        setMode("page");
        setDoc({ name: f.name, kind: "pptx", buf, text: await pptxText(buf) });
      } else {
        setDoc({ name: f.name, kind: "text", text: await f.text() });
      }
      setRecent((prev) => {
        const next = [{ name: f.name, kind: f.name.split(".").pop()?.toUpperCase() || "DOC" }, ...prev.filter((r) => r.name !== f.name)].slice(0, 4);
        try { localStorage.setItem("sq-recent-docs", JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    } catch {
      strobiSay("That file could not be opened.", "error");
    }
  }

  const speak = () => {
    const s = window.speechSynthesis;
    if (!s || !doc?.text) return strobiSay("Speech is not supported in this browser.", "error");
    if (speaking) {
      s.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(doc.text.slice(0, 20000));
    u.rate = tts.rate;
    u.pitch = tts.pitch;
    const v = voices.find((x) => x.name === tts.voice);
    if (v) u.voice = v;
    u.onend = () => setSpeaking(false);
    s.speak(u);
    setSpeaking(true);
  };

  const sizeCls = fontSize === "sm" ? "text-xs" : fontSize === "lg" ? "text-base" : "text-sm";
  const familyCls = fontFamily === "serif" ? "font-serif" : fontFamily === "mono" ? "font-mono" : "font-sans";
  const leadingCls = lineSpacing === "tight" ? "leading-snug" : lineSpacing === "airy" ? "leading-loose" : "leading-relaxed";
  const textSizeCls = `${sizeCls} ${familyCls} ${leadingCls}`;

  const captureSelection = () => {
    const s = window.getSelection()?.toString().trim() ?? "";
    if (s.length >= 3) {
      setSelText(s.slice(0, 600));
    } else {
      setSelText("");
    }
  };

  const explainSelection = async () => {
    if (!selText || aiBusy) return;
    setAiBusy(true);
    try {
      const res = await askAI(`Explain this excerpt clearly in 2-3 sentences:\n\n"${selText}"`);
      setAiExplain(res);
    } catch {
      strobiSay("Could not explain selection right now.", "error");
    }
    setAiBusy(false);
  };

  const textView =
    doc &&
    (bio ? (
      <p className={`prose-sq whitespace-pre-wrap ${textSizeCls}`}>
        {bionic(doc.text).map((w, i) => (
          <span key={i}>
            <b>{w.b}</b>
            {w.r}
          </span>
        ))}
      </p>
    ) : (
      <p className={`prose-sq whitespace-pre-wrap ${textSizeCls}`}>{doc.text}</p>
    ));

  const viewer = (
    <HeroCard
      tint="tools"
      hardShadow
      title="Reader"
      subtitle={doc?.name ?? "PDF, DOCX, XLSX, CSV, TXT, EPUB"}
      action={
        <label className="btn btn-lime btn-sm cursor-pointer shadow-xs">
          <FileArrowUp size={16} weight="bold" />
          <span>Open</span>
          <input
            type="file"
            hidden
            accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md,.epub,.pptx"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void open(f);
              e.target.value = "";
            }}
          />
        </label>
      }
      className="gap-2.5 h-full"
    >
      {doc && (doc.kind === "pdf" || doc.kind === "docx" || doc.kind === "text" || doc.kind === "pptx") && (
        <div className="flex flex-wrap items-center gap-2 text-xs border-b border-line/40 pb-2 shrink-0">
          {(doc.kind === "pdf" || doc.kind === "pptx") && (
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: "page", label: doc.kind === "pptx" ? "Slides" : "Pages" },
                { value: "text", label: "Text" },
              ]}
            />
          )}
          <button
            className={`chip ${bio ? "bg-primary text-on-primary font-bold" : ""}`}
            aria-pressed={bio}
            onClick={() => {
              setBio(!bio);
              if (doc.kind === "pdf" || doc.kind === "pptx") setMode("text");
            }}
          >
            Bionic reading
          </button>
          <button className="chip" onClick={speak}>
            {speaking ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" />}
            {speaking ? "Stop" : "Read aloud"}
          </button>
          {/* Aa Reading Surface Swatches & Size */}
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Reading surface">
            {(Object.keys(READ_SURFACE) as ReadSurface[]).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={surface === k}
                title={READ_SURFACE[k].label}
                onClick={() => setSurface(k)}
                className={`grid size-7 place-items-center rounded-lg border text-[11px] font-extrabold transition ${READ_SURFACE[k].swatch} ${
                  surface === k ? "border-border-strong ring-2 ring-primary" : "border-line opacity-75 hover:opacity-100"
                }`}
              >
                Aa
              </button>
            ))}
          </div>
          <Segmented
            size="xs"
            ariaLabel="Font size"
            value={fontSize}
            onChange={setFontSize}
            options={[
              { value: "sm", label: "SM" },
              { value: "md", label: "MD" },
              { value: "lg", label: "LG" },
            ]}
          />
          <Segmented
            size="xs"
            ariaLabel="Font family"
            value={fontFamily}
            onChange={setFontFamily}
            options={[
              { value: "sans", label: "Sans", className: "font-sans" },
              { value: "serif", label: "Serif", className: "font-serif" },
              { value: "mono", label: "Mono", className: "font-mono" },
            ]}
          />
          <Segmented
            size="xs"
            ariaLabel="Line spacing"
            value={lineSpacing}
            onChange={setLineSpacing}
            options={[
              { value: "tight", label: "1.3×", className: "num" },
              { value: "normal", label: "1.6×", className: "num" },
              { value: "airy", label: "2.0×", className: "num" },
            ]}
          />
          <div className="flex items-center gap-1.5 ml-auto">
            <SpeakerHigh size={14} className="text-muted" aria-hidden />
            <div className="w-16">
              <Slider
                min={0.5}
                max={2}
                step={0.1}
                value={tts.rate}
                onChange={(e) => setTts({ ...tts, rate: +e.target.value })}
                aria-label="Speech speed"
              />
            </div>
            {voices.length > 0 && (
              <div className="max-w-32">
                <Select
                  value={tts.voice}
                  onChange={(v) => setTts({ ...tts, voice: v })}
                  options={[{ value: "", label: "Default voice" }, ...voices.map((v) => ({ value: v.name, label: v.name }))]}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {!doc ? (
        <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
          <div className="relative flex-1 min-h-0 flex flex-col">
            <DashedDropzone
              accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md,.epub,.pptx"
              files={[]}
              onFilesChange={(fl) => {
                if (fl[0]) void open(fl[0]);
              }}
              title="Drop a PDF, DOCX, XLSX or TXT here"
              subtitle="Parsed 100% locally in your browser. Nothing uploads."
              className="flex-1 min-h-0 justify-center bg-surface/75"
            />
            <Illustration name="open-book" tone="tools" className="hidden sm:block pointer-events-none absolute right-6 bottom-5 w-20 h-16 opacity-75 animate-blob" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex flex-wrap gap-1.5">
              {["PDF", "DOCX", "PPTX", "XLSX", "EPUB", "TXT"].map((fmt) => (
                <span key={fmt} className="chip !min-h-6 !px-2.5 text-[11px] font-bold bg-surface/90">
                  {fmt}
                </span>
              ))}
            </div>
            {recent.length > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted overflow-hidden">
                <Clock size={13} className="shrink-0" />
                <span className="truncate font-semibold">Recent: {recent.map((r) => r.name).join(" · ")}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="relative flex-1 min-h-0 flex flex-col gap-2">
          {selText && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-border-strong bg-surface-inverse px-3 py-1.5 text-on-inverse shadow-md shrink-0">
              <span className="text-[11px] font-bold truncate max-w-44 opacity-80">&ldquo;{selText}&rdquo;</span>
              <button
                type="button"
                className="rounded-full bg-soft px-2.5 py-0.5 text-[11px] font-bold hover:bg-primary hover:text-on-primary transition inline-flex items-center gap-1"
                onClick={() => {
                  void navigator.clipboard?.writeText(selText);
                  strobiSay("Copied selection", "tip");
                }}
              >
                <Copy size={12} /> Copy
              </button>
              <button
                type="button"
                className="rounded-full bg-soft px-2.5 py-0.5 text-[11px] font-bold hover:bg-primary hover:text-on-primary transition inline-flex items-center gap-1"
                onClick={() => {
                  void notesRepo.add({ title: `Clip: ${doc.name}`, content: `> ${selText}\n\n`, tags: ["reader"] });
                  strobiSay("Clipped to Notes", "tip");
                }}
              >
                <NotePencil size={12} /> Clip to Notes
              </button>
              <button
                type="button"
                disabled={aiBusy}
                className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-extrabold text-on-primary inline-flex items-center gap-1"
                onClick={() => void explainSelection()}
              >
                <Sparkle size={12} weight="fill" /> {aiBusy ? "Thinking..." : "Explain"}
              </button>
              <button type="button" aria-label="Clear selection" className="ml-auto opacity-70 hover:opacity-100" onClick={() => { setSelText(""); setAiExplain(null); }}>
                <X size={13} />
              </button>
            </div>
          )}
          {aiExplain && (
            <div className="rounded-2xl border border-border-strong/30 bg-surface p-3 text-xs text-fg shadow-xs shrink-0 flex items-start justify-between gap-2">
              <p className="leading-relaxed">{aiExplain}</p>
              <button type="button" aria-label="Dismiss explanation" onClick={() => setAiExplain(null)}><X size={14} /></button>
            </div>
          )}
          <ScrollArea
            onMouseUp={captureSelection}
            onKeyUp={captureSelection}
            className={`flex-1 min-h-0 rounded-[24px] p-4 border border-line/30 transition-colors ${READ_SURFACE[surface].cls}`}
          >
            {doc.kind === "pdf" && (mode === "page" ? <div ref={host} className="flex flex-col items-center" /> : textView)}
            {doc.kind === "docx" && (bio ? textView : <div className={`prose-sq ${textSizeCls}`} dangerouslySetInnerHTML={{ __html: doc.html ?? "" }} />)}
            {doc.kind === "text" && textView}
            {doc.kind === "pptx" && (mode === "page" ? <div ref={pptxHost} className="w-full overflow-x-auto" /> : textView)}
            {doc.kind === "sheet" && doc.rows && (
              <table className="w-full text-left text-xs">
                <tbody>
                  {doc.rows.map((r, i) => (
                    <tr key={i} className={i === 0 ? "font-bold bg-surface/50" : "border-t border-line/10"}>
                      {r.map((c, j) => (
                        <td key={j} className="num px-2 py-1.5">{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ScrollArea>
        </div>
      )}
    </HeroCard>
  );

  return (
    <PageFrame title="Reader" subtitle="Read, listen, and edit documents without leaving the app.">
      <Panels
        className="lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)]"
        panels={[
          { id: "view", label: "Reader", className: "lg:col-span-7", node: viewer },
          { id: "studio", label: "Studio", className: "lg:col-span-5", node: <StudioTools /> },
        ]}
      />
    </PageFrame>
  );
}
