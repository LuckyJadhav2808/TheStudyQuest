"use client";
export async function pdfjs() {
  const lib = await import("pdfjs-dist");
  lib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${lib.version}/build/pdf.worker.min.mjs`;
  return lib;
}
export async function pdfText(buf: ArrayBuffer): Promise<string> {
  const lib = await pdfjs();
  const doc = await lib.getDocument({ data: buf.slice(0) }).promise;
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const tc = await (await doc.getPage(i)).getTextContent();
    out.push(tc.items.map((it) => ("str" in it ? it.str : "")).join(" "));
  }
  return out.join("\n\n");
}
export async function renderPdf(buf: ArrayBuffer, host: HTMLElement, scale = 1.3, max = 40): Promise<void> {
  const lib = await pdfjs();
  const doc = await lib.getDocument({ data: buf.slice(0) }).promise;
  host.innerHTML = "";
  for (let i = 1; i <= Math.min(doc.numPages, max); i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = vp.width; canvas.height = vp.height;
    canvas.className = "mb-3 max-w-full rounded-xl bg-white shadow";
    host.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    if (ctx) await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
  }
}
export async function docxToHtml(buf: ArrayBuffer): Promise<{ html: string; text: string }> {
  const mammoth = await import("mammoth");
  const [h, t] = await Promise.all([mammoth.convertToHtml({ arrayBuffer: buf }), mammoth.extractRawText({ arrayBuffer: buf })]);
  return { html: h.value, text: t.value };
}
export async function sheetRows(file: File): Promise<string[][]> {
  if (/\.csv$/i.test(file.name)) {
    const Papa = (await import("papaparse")).default;
    return Papa.parse<string[]>(await file.text(), { skipEmptyLines: true }).data.slice(0, 500);
  }
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer());
  return (XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" }) as unknown[][]).slice(0, 500).map((r) => r.map(String));
}
export async function epubText(buf: ArrayBuffer): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buf);
  const names = Object.keys(zip.files).filter((n) => /\.(xhtml|html|htm)$/i.test(n)).sort();
  const parts: string[] = [];
  for (const n of names) parts.push(new DOMParser().parseFromString(await zip.files[n].async("string"), "text/html").body.textContent ?? "");
  return parts.join("\n\n").replace(/\n{3,}/g, "\n\n");
}
export function bionic(text: string): { b: string; r: string }[] {
  return text.split(/(\s+)/).map((w) => { const n = Math.ceil(w.length / 2); return /\S/.test(w) ? { b: w.slice(0, n), r: w.slice(n) } : { b: "", r: w }; });
}
export async function pptxText(buf: ArrayBuffer): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buf.slice(0));
  const slideNames = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
    .sort((a, b) => parseInt(a.replace(/\D/g, ""), 10) - parseInt(b.replace(/\D/g, ""), 10));
  const slides: string[] = [];
  for (const name of slideNames) {
    const xml = await zip.files[name].async("string");
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const runs = Array.from(doc.getElementsByTagName("a:t")).map((n) => n.textContent ?? "").filter(Boolean);
    if (runs.length) slides.push(runs.join(" "));
  }
  return slides.join("\n\n");
}
export async function renderPptx(buf: ArrayBuffer, host: HTMLElement): Promise<() => void> {
  const { init } = await import("pptx-preview");
  host.innerHTML = "";
  const w = Math.max(420, Math.min(820, (host.clientWidth || 640) - 8));
  const previewer = init(host, { width: w, height: Math.round(w * 0.58), mode: "list" });
  await previewer.preview(buf.slice(0));
  return () => previewer.destroy();
}
export async function compressPdf(buf: ArrayBuffer, quality = 0.68, scale = 1.25): Promise<Uint8Array> {
  const lib = await pdfjs();
  const { PDFDocument } = await import("pdf-lib");
  const src = await lib.getDocument({ data: buf.slice(0) }).promise;
  const out = await PDFDocument.create();
  for (let i = 1; i <= src.numPages; i++) {
    const page = await src.getPage(i);
    const baseVp = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(vp.width));
    canvas.height = Math.max(1, Math.round(vp.height));
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
    const jpgBytes = await fetch(canvas.toDataURL("image/jpeg", quality)).then((r) => r.arrayBuffer());
    const jpg = await out.embedJpg(jpgBytes);
    const outPage = out.addPage([baseVp.width, baseVp.height]);
    outPage.drawImage(jpg, { x: 0, y: 0, width: baseVp.width, height: baseVp.height });
  }
  return out.save();
}
export async function textToDocxBlob(title: string, text: string): Promise<Blob> {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");
  const lines = text.split(/\r?\n/);
  const children = [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
    ...lines.map((line) => {
      const m = /^(#{1,3})\s+(.+)$/.exec(line.trim());
      if (m) {
        const heading = m[1].length === 1 ? HeadingLevel.HEADING_1 : m[1].length === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
        return new Paragraph({ text: m[2], heading });
      }
      return new Paragraph({ children: [new TextRun(line)] });
    }),
  ];
  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}
