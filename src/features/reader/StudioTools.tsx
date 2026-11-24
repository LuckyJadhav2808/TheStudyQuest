"use client";
import { useState } from "react";
import { Card, CardTitle, Segmented } from "@/components/ui/misc";
import { Field } from "@/components/ui/fields";
import { askAI } from "@/lib/aiClient";
import { MarkdownView } from "@/lib/MarkdownView";
import { renderMarkdown } from "@/lib/markdown";
import { strobiSay } from "@/features/strobi/toast";
import { downloadBlob } from "@/lib/utils";
import { pdfText } from "./docUtils";

type Tool = "merge" | "split" | "rotate" | "text" | "mark" | "convert" | "image" | "scan";
const TOOLS: { value: Tool; label: string }[] = [{ value: "merge", label: "Merge" }, { value: "split", label: "Split" }, { value: "rotate", label: "Rotate" }, { value: "text", label: "Text" }, { value: "mark", label: "Watermark" }, { value: "convert", label: "Convert" }, { value: "image", label: "Image" }, { value: "scan", label: "Scan" }];
const save = (name: string, bytes: Uint8Array) => downloadBlob(name, bytes as BlobPart, "application/pdf");

export function StudioTools() {
  const [tool, setTool] = useState<Tool>("merge");
  const [files, setFiles] = useState<File[]>([]);
  const [range, setRange] = useState("1-1");
  const [mark, setMark] = useState("CONFIDENTIAL");
  const [redact, setRedact] = useState(false);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState("");
  const [info, setInfo] = useState("");
  const accept = tool === "image" || tool === "scan" ? "image/*" : tool === "convert" ? ".pdf,.md,.markdown,.txt" : ".pdf";

  async function go() {
    if (!files.length) return;
    setBusy(true); setOut(""); setInfo("");
    try {
      const { PDFDocument, degrees, rgb, StandardFonts } = await import("pdf-lib");
      const f = files[0];
      if (tool === "merge") { const m = await PDFDocument.create(); for (const x of files) { const d = await PDFDocument.load(await x.arrayBuffer()); (await m.copyPages(d, d.getPageIndices())).forEach((p) => m.addPage(p)); } save("merged.pdf", await m.save()); }
      if (tool === "split") { const [a, b] = range.split("-").map((n) => parseInt(n, 10)); const d = await PDFDocument.load(await f.arrayBuffer()); const n = d.getPageCount(); const s = Math.max(1, a || 1), e = Math.min(n, b || s); const o = await PDFDocument.create(); (await o.copyPages(d, Array.from({ length: e - s + 1 }, (_, i) => s - 1 + i))).forEach((p) => o.addPage(p)); save(`pages-${s}-${e}.pdf`, await o.save()); }
      if (tool === "rotate") { const d = await PDFDocument.load(await f.arrayBuffer()); d.getPages().forEach((p) => p.setRotation(degrees((p.getRotation().angle + 90) % 360))); save("rotated.pdf", await d.save()); }
      if (tool === "text") { const t = await pdfText(await f.arrayBuffer()); setOut(t); downloadBlob("extracted.txt", t); }
      if (tool === "mark") { const d = await PDFDocument.load(await f.arrayBuffer()); const font = await d.embedFont(StandardFonts.HelveticaBold); d.getPages().forEach((p) => { const { width, height } = p.getSize(); if (redact) p.drawRectangle({ x: width * 0.1, y: height * 0.75, width: width * 0.8, height: 28, color: rgb(0, 0, 0) }); else p.drawText(mark, { x: width * 0.12, y: height * 0.4, size: 56, font, color: rgb(0.8, 0.1, 0.1), opacity: 0.25, rotate: degrees(35) }); }); save(redact ? "redacted.pdf" : "watermarked.pdf", await d.save()); }
      if (tool === "convert") {
        if (/\.pdf$/i.test(f.name)) { const t = await pdfText(await f.arrayBuffer()); const md = t.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).join("\n\n"); setOut(md); downloadBlob("converted.md", md, "text/markdown"); downloadBlob("converted.html", await renderMarkdown(md), "text/html"); setInfo("Best effort: layout and tables are not preserved."); }
        else { const d = await PDFDocument.create(); const font = await d.embedFont(StandardFonts.Helvetica); const lines = (await f.text()).replace(/[^\x20-\x7E\n]/g, "?").split("\n").flatMap((l) => l.match(/.{1,90}/g) ?? [""]); let p = d.addPage(); let y = 800; for (const l of lines) { if (y < 50) { p = d.addPage(); y = 800; } p.drawText(l, { x: 50, y, size: 11, font }); y -= 15; } save("converted.pdf", await d.save()); setInfo("Plain-text rendering. Non-ASCII characters are replaced."); }
      }
      if (tool === "image") { const c = (await import("browser-image-compression")).default; const r = await c(f, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true }); setInfo(`${(f.size / 1024).toFixed(0)} KB to ${(r.size / 1024).toFixed(0)} KB`); downloadBlob(`optimised-${f.name}`, r, r.type); }
      if (tool === "scan") { const { createWorker } = await import("tesseract.js"); const w = await createWorker("eng"); const { data } = await w.recognize(f); await w.terminate(); setOut(data.text); try { setInfo(await askAI(`Explain this homework problem step by step:\n\n${data.text}`, "You are a patient tutor. Use Markdown.")); } catch { setInfo("OCR done. Add an API key in Settings for AI explanations."); } }
    } catch (e) { strobiSay(e instanceof Error ? e.message : "Tool failed", "error"); }
    setBusy(false);
  }
  return (
    <Card className="gap-3">
      <CardTitle sub="Everything runs in your browser. Files never upload.">Document studio</CardTitle>
      <Segmented value={tool} onChange={(t) => { setTool(t); setFiles([]); setOut(""); setInfo(""); }} options={TOOLS} className="max-w-full shrink-0 self-start overflow-x-auto no-scrollbar" />
      <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-3">
        <Field label={tool === "merge" ? "PDF files (pick several)" : "File"}><input type="file" accept={accept} multiple={tool === "merge"} className="input !py-2" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} /></Field>
        {tool === "split" && <Field label="Page range (for example 2-5)"><input className="input" value={range} onChange={(e) => setRange(e.target.value)} /></Field>}
        {tool === "mark" && <><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="size-4 accent-ink" checked={redact} onChange={(e) => setRedact(e.target.checked)} />Redact mode (black bar near the top of each page)</label>{!redact && <Field label="Watermark text"><input className="input" value={mark} onChange={(e) => setMark(e.target.value)} /></Field>}</>}
        <button className="btn btn-lime self-start" onClick={() => void go()} disabled={busy || !files.length}>{busy ? "Working..." : "Run tool"}</button>
        {info && (tool === "scan" ? <div className="tile"><MarkdownView source={info} className="!text-sm" /></div> : <p className="text-sm text-muted" role="status">{info}</p>)}
        {out && <textarea readOnly className="input !min-h-40 font-mono text-xs" value={out} aria-label="Tool output" />}
      </div>
    </Card>
  );
}
