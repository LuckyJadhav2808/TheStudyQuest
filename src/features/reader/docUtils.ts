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
