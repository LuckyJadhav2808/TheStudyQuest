"use client";
import { useState } from "react";
import { BentoCard } from "@/components/shell/BentoCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Segmented } from "@/components/ui/misc";
import { Field } from "@/components/ui/fields";
import { Checkbox } from "@/components/ui/checkbox";
import { DashedDropzone } from "@/components/ui/dropzone";
import { askAI } from "@/lib/aiClient";
import { MarkdownView } from "@/lib/MarkdownView";
import { renderMarkdown } from "@/lib/markdown";
import { strobiSay } from "@/features/strobi/toast";
import { downloadBlob } from "@/lib/utils";
import { pdfText } from "./docUtils";

type Tool = "merge" | "split" | "rotate" | "text" | "mark" | "convert" | "image" | "scan";
const TOOLS: { value: Tool; label: string }[] = [
  { value: "merge", label: "Merge" },
  { value: "split", label: "Split" },
  { value: "rotate", label: "Rotate" },
  { value: "text", label: "Text" },
  { value: "mark", label: "Watermark" },
  { value: "convert", label: "Convert" },
  { value: "image", label: "Image" },
  { value: "scan", label: "Scan" },
];
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
  const accept =
    tool === "image" || tool === "scan"
      ? "image/*"
      : tool === "convert"
      ? ".pdf,.md,.markdown,.txt"
      : ".pdf";

  async function go() {
    if (!files.length) return;
    setBusy(true);
    setOut("");
    setInfo("");
    try {
      const { PDFDocument, degrees, rgb, StandardFonts } = await import("pdf-lib");
      const f = files[0];
      if (tool === "merge") {
        const m = await PDFDocument.create();
        for (const x of files) {
          const d = await PDFDocument.load(await x.arrayBuffer());
          (await m.copyPages(d, d.getPageIndices())).forEach((p) => m.addPage(p));
        }
        save("merged.pdf", await m.save());
      }
      if (tool === "split") {
        const [a, b] = range.split("-").map((n) => parseInt(n, 10));
        const d = await PDFDocument.load(await f.arrayBuffer());
        const n = d.getPageCount();
        const s = Math.max(1, a || 1),
          e = Math.min(n, b || s);
        const o = await PDFDocument.create();
        (await o.copyPages(d, Array.from({ length: e - s + 1 }, (_, i) => s - 1 + i))).forEach((p) => o.addPage(p));
        save(`pages-${s}-${e}.pdf`, await o.save());
      }
      if (tool === "rotate") {
        const d = await PDFDocument.load(await f.arrayBuffer());
        d.getPages().forEach((p) => p.setRotation(degrees((p.getRotation().angle + 90) % 360)));
        save("rotated.pdf", await d.save());
      }
      if (tool === "text") {
        const t = await pdfText(await f.arrayBuffer());
        setOut(t);
        downloadBlob("extracted.txt", t);
      }
      if (tool === "mark") {
        const d = await PDFDocument.load(await f.arrayBuffer());
        const font = await d.embedFont(StandardFonts.HelveticaBold);
        d.getPages().forEach((p) => {
          const { width, height } = p.getSize();
          if (redact)
            p.drawRectangle({
              x: width * 0.1,
              y: height * 0.75,
              width: width * 0.8,
              height: 28,
              color: rgb(0, 0, 0),
            });
          else
            p.drawText(mark, {
              x: width * 0.12,
              y: height * 0.4,
              size: 56,
              font,
              color: rgb(0.8, 0.1, 0.1),
              opacity: 0.25,
              rotate: degrees(35),
            });
        });
        save(redact ? "redacted.pdf" : "watermarked.pdf", await d.save());
      }
      if (tool === "convert") {
        if (/\.pdf$/i.test(f.name)) {
          const t = await pdfText(await f.arrayBuffer());
          const md = t
            .split(/\n{2,}/)
            .map((p) => p.trim())
            .filter(Boolean)
            .join("\n\n");
          setOut(md);
          downloadBlob("converted.md", md, "text/markdown");
          downloadBlob("converted.html", await renderMarkdown(md), "text/html");
          setInfo("Best effort: layout and tables are not preserved.");
        } else {
          const d = await PDFDocument.create();
          const font = await d.embedFont(StandardFonts.Helvetica);
          const lines = (await f.text())
            .replace(/[^\x20-\x7E\n]/g, "?")
            .split("\n")
            .flatMap((l) => l.match(/.{1,90}/g) ?? [""]);
          let p = d.addPage();
          let y = 800;
          for (const l of lines) {
            if (y < 50) {
              p = d.addPage();
              y = 800;
            }
            p.drawText(l, { x: 50, y, size: 11, font });
            y -= 15;
          }
          save("converted.pdf", await d.save());
          setInfo("Plain-text rendering. Non-ASCII characters are replaced.");
        }
      }
      if (tool === "image") {
        const c = (await import("browser-image-compression")).default;
        const r = await c(f, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true });
        setInfo(`${(f.size / 1024).toFixed(0)} KB to ${(r.size / 1024).toFixed(0)} KB`);
        downloadBlob(`optimised-${f.name}`, r, r.type);
      }
      if (tool === "scan") {
        const { createWorker } = await import("tesseract.js");
        const w = await createWorker("eng");
        const { data } = await w.recognize(f);
        await w.terminate();
        setOut(data.text);
        try {
          setInfo(
            await askAI(
              `Explain this homework problem step by step:\n\n${data.text}`,
              "You are a patient tutor. Use Markdown."
            )
          );
        } catch {
          setInfo("OCR complete. Configure an API key in Settings for AI explanations.");
        }
      }
    } catch (e) {
      strobiSay(e instanceof Error ? e.message : "Tool failed", "error");
    }
    setBusy(false);
  }

  return (
    <BentoCard
      title="Document studio"
      subtitle="Local processing, files never upload."
      className="gap-2.5 h-full"
    >
      <div className="overflow-x-auto no-scrollbar shrink-0 pb-1">
        <Segmented
          value={tool}
          onChange={(t) => {
            setTool(t);
            setFiles([]);
            setOut("");
            setInfo("");
          }}
          options={TOOLS}
          className="shrink-0"
        />
      </div>

      <ScrollArea className="flex-1 min-h-0 pr-1">
        <div className="flex flex-col gap-3 pb-2">
          <DashedDropzone
            accept={accept}
            multiple={tool === "merge"}
            files={files}
            onFilesChange={setFiles}
            title={tool === "merge" ? "Drop PDF files (or click to pick several)" : "Drop document here or click to browse"}
            subtitle="Processed entirely in-browser with WebAssembly"
          />

          {tool === "split" && (
            <Field label="Page range (e.g. 1-3)">
              <input
                className="input !min-h-9 text-xs"
                value={range}
                onChange={(e) => setRange(e.target.value)}
                placeholder="1-3"
              />
            </Field>
          )}

          {tool === "mark" && (
            <div className="flex flex-col gap-2 rounded-2xl border border-line bg-soft/30 p-3">
              <label className="flex items-center gap-2.5 text-xs font-bold cursor-pointer">
                <Checkbox checked={redact} onCheckedChange={(c) => setRedact(Boolean(c))} />
                <span>Redact mode (black bar near top)</span>
              </label>
              {!redact && (
                <Field label="Watermark text">
                  <input
                    className="input !min-h-9 text-xs"
                    value={mark}
                    onChange={(e) => setMark(e.target.value)}
                  />
                </Field>
              )}
            </div>
          )}

          <button
            className="btn btn-lime self-start px-5 py-2 text-xs font-bold shadow-xs hover:scale-105 active:scale-95 transition"
            onClick={() => void go()}
            disabled={busy || !files.length}
          >
            {busy ? "Processing..." : "Run tool"}
          </button>

          {!out && !info && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line/60 bg-soft/25 p-4 text-center mt-1">
              <p className="text-xs font-bold text-fg">Ready to run</p>
              <p className="text-[11px] text-muted max-w-xs mt-0.5">
                {tool === "merge" && "Select 2 or more PDFs to merge into a single file."}
                {tool === "split" && "Extract a sub-range of pages into a new PDF."}
                {tool === "rotate" && "Rotates all pages 90° clockwise."}
                {tool === "text" && "Extracts text from PDF into a .txt file."}
                {tool === "mark" && "Stamps watermark or confidential redaction bars."}
                {tool === "convert" && "Converts markdown to PDF or PDF to markdown."}
                {tool === "image" && "Optimizes and compresses image attachments."}
                {tool === "scan" && "OCR extraction from photos and scans."}
              </p>
            </div>
          )}

          {info && (
            <div className="tile p-3 text-xs">
              {tool === "scan" ? (
                <MarkdownView source={info} className="!text-xs" />
              ) : (
                <p className="text-xs text-muted" role="status">{info}</p>
              )}
            </div>
          )}

          {out && (
            <textarea
              readOnly
              className="input !min-h-32 font-mono text-xs rounded-2xl bg-surface border border-line p-3"
              value={out}
              aria-label="Tool output"
            />
          )}
        </div>
      </ScrollArea>
    </BentoCard>
  );
}
