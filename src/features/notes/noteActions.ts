"use client";
import { emit } from "@/core/events";
import { flashcardsRepo, notesRepo } from "@/core/repos";
import type { Note } from "@/core/types";
import { summarizeWithLocalAi } from "@/lib/localAi";
import { extractTopics } from "@/lib/localNlp";
import { renderMarkdown, mdToText } from "@/lib/markdown";
import { downloadBlob } from "@/lib/utils";

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

function isSafeUrl(url: string, allowDataImage = false): boolean {
  const clean = url.trim().toLowerCase();
  if (!clean) return false;
  if (clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("mailto:") || clean.startsWith("#") || clean.startsWith("/")) {
    return true;
  }
  if (allowDataImage && clean.startsWith("data:image/")) return true;
  return false;
}

function domToMd(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? "").replace(/\s+/g, " ");
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const kids = () => Array.from(el.childNodes).map(domToMd).join("");

  if (tag === "br") return "\n";
  if (tag === "hr") return "\n---\n\n";
  if (/^h[1-6]$/.test(tag)) {
    const lvl = "#".repeat(Number(tag[1]));
    const txt = kids().trim();
    return txt ? `\n${lvl} ${txt}\n\n` : "";
  }
  if (tag === "p") {
    const txt = kids().trim();
    return txt ? `${txt}\n\n` : "";
  }
  if (tag === "strong" || tag === "b") {
    const txt = kids().trim();
    return txt ? `**${txt}**` : "";
  }
  if (tag === "em" || tag === "i") {
    const txt = kids().trim();
    return txt ? `*${txt}*` : "";
  }
  if (tag === "del" || tag === "s") {
    const txt = kids().trim();
    return txt ? `~~${txt}~~` : "";
  }
  if (tag === "code") {
    if (el.parentElement?.tagName.toLowerCase() === "pre") return el.textContent ?? "";
    const txt = (el.textContent ?? "").trim();
    return txt ? `\`${txt}\`` : "";
  }
  if (tag === "pre") {
    const codeEl = el.querySelector("code");
    const cls = codeEl?.className ?? "";
    const lang = /language-([a-z0-9_-]+)/i.exec(cls)?.[1] ?? "";
    const raw = (codeEl?.textContent ?? el.textContent ?? "").replace(/\n+$/, "");
    return `\n\`\`\`${lang}\n${raw}\n\`\`\`\n\n`;
  }
  if (tag === "a") {
    const href = el.getAttribute("href") ?? "";
    const label = kids().trim() || href;
    return isSafeUrl(href) ? `[${label}](${href})` : label;
  }
  if (tag === "img") {
    const src = el.getAttribute("src") ?? "";
    const alt = (el.getAttribute("alt") ?? "image").replace(/[\[\]]/g, "");
    return isSafeUrl(src, true) ? `\n![${alt}](${src})\n\n` : "";
  }
  if (tag === "div" && el.classList.contains("callout")) {
    const kind = (el.getAttribute("data-callout") || "note").toUpperCase();
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelector(".callout-title")?.remove();
    const lines = domToMd(clone)
      .trim()
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n");
    return `\n> [!${kind}]\n${lines}\n\n`;
  }
  if (tag === "blockquote") {
    const lines = kids()
      .trim()
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n");
    return lines ? `\n${lines}\n\n` : "";
  }
  if (tag === "ul" || tag === "ol") {
    const items = Array.from(el.children)
      .filter((c) => c.tagName.toLowerCase() === "li")
      .map((li, idx) => {
        const cb = li.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
        const prefix = cb ? (cb.checked ? "- [x] " : "- [ ] ") : tag === "ol" ? `${idx + 1}. ` : "- ";
        const text = Array.from(li.childNodes)
          .filter((n) => !(n instanceof HTMLElement && n.tagName.toLowerCase() === "input"))
          .map(domToMd)
          .join("")
          .trim()
          .replace(/\n+/g, " ");
        return `${prefix}${text}`;
      })
      .join("\n");
    return items ? `\n${items}\n\n` : "";
  }
  if (tag === "table") {
    const rows = Array.from(el.querySelectorAll("tr")).map((tr) =>
      Array.from(tr.children).map((cell) => domToMd(cell).trim().replace(/\|/g, "\\|").replace(/\n+/g, " "))
    );
    if (rows.length === 0) return "";
    const cols = Math.max(...rows.map((r) => r.length));
    const norm = (r: string[]) => `| ${Array.from({ length: cols }, (_, i) => r[i] ?? "").join(" | ")} |`;
    const head = norm(rows[0]);
    const sep = `| ${Array.from({ length: cols }, () => "---").join(" | ")} |`;
    const body = rows.slice(1).map(norm).join("\n");
    return `\n${head}\n${sep}${body ? `\n${body}` : ""}\n\n`;
  }
  return kids();
}

/** Sanitizes an HTML string/document and converts it to clean StudyQuest Markdown. */
export function htmlToStudyMarkdown(rawHtml: string, fallbackTitle = "Imported HTML"): { title: string; markdown: string } {
  const doc = new DOMParser().parseFromString(rawHtml, "text/html");
  doc.querySelectorAll("script, style, noscript, iframe, object, embed, link, meta").forEach((el) => el.remove());
  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.toLowerCase().startsWith("on")) el.removeAttribute(attr.name);
    }
  });
  const title =
    doc.querySelector("h1")?.textContent?.trim() ||
    doc.querySelector("title")?.textContent?.trim() ||
    fallbackTitle;
  const markdown = domToMd(doc.body)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { title, markdown };
}

export async function importMarkdownFiles(files: FileList | File[]): Promise<string | null> {
  let lastId: string | null = null;
  for (const f of Array.from(files)) {
    if (f.size > MAX_IMPORT_BYTES) continue;
    const isHtml = /\.(html?|xhtml)$/i.test(f.name);
    const isMd = /\.(md|markdown|txt)$/i.test(f.name);
    if (!isHtml && !isMd) continue;

    const raw = await f.text();
    if (!raw.trim()) continue;

    if (isHtml) {
      const baseName = f.name.replace(/\.\w+$/, "") || "Imported HTML";
      const { title, markdown } = htmlToStudyMarkdown(raw, baseName);
      if (!markdown.trim()) continue;
      const n = await notesRepo.add({ title, content: markdown, tags: ["imported", "html"] });
      emit("note.created", { title });
      lastId = n.id;
    } else {
      const h1 = /^#\s+(.+)$/m.exec(raw);
      const title = h1 ? h1[1].trim() : f.name.replace(/\.\w+$/, "");
      const n = await notesRepo.add({ title, content: raw, tags: ["imported"] });
      emit("note.created", { title });
      lastId = n.id;
    }
  }
  return lastId;
}
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
}

export type ExportTheme = "white" | "black" | "pastel" | "obsidian";

export const EXPORT_THEMES: { id: ExportTheme; label: string; bg: string; fg: string; accent: string }[] = [
  { id: "white", label: "White", bg: "#ffffff", fg: "#111111", accent: "#e4e4e7" },
  { id: "black", label: "Black", bg: "#000000", fg: "#fafafa", accent: "#27272a" },
  { id: "pastel", label: "Light · Pastel", bg: "#f4e7fb", fg: "#1e192b", accent: "#c8a8e9" },
  { id: "obsidian", label: "Dark · Obsidian", bg: "#141414", fg: "#f9f9f9", accent: "#cf4300" },
];

const EXPORT_PALETTES: Record<
  ExportTheme,
  {
    bg: string;
    surface: string;
    surface2: string;
    fg: string;
    muted: string;
    border: string;
    primary: string;
    onPrimary: string;
    tint: string;
    tintText: string;
    shadow: string;
  }
> = {
  white: {
    bg: "#ffffff",
    surface: "#ffffff",
    surface2: "#f4f4f5",
    fg: "#111111",
    muted: "#52525b",
    border: "#18181b",
    primary: "#18181b",
    onPrimary: "#ffffff",
    tint: "#f4f4f5",
    tintText: "#18181b",
    shadow: "0 8px 24px -10px rgba(0,0,0,0.1)",
  },
  black: {
    bg: "#000000",
    surface: "#0a0a0a",
    surface2: "#18181b",
    fg: "#fafafa",
    muted: "#a1a1aa",
    border: "#3f3f46",
    primary: "#ffffff",
    onPrimary: "#000000",
    tint: "#18181b",
    tintText: "#fafafa",
    shadow: "0 12px 32px -12px rgba(0,0,0,0.8)",
  },
  pastel: {
    bg: "#f4e7fb",
    surface: "#fcf8ff",
    surface2: "#f2dddc",
    fg: "#1e192b",
    muted: "#5b516e",
    border: "#231b30",
    primary: "#c8a8e9",
    onPrimary: "#1e192b",
    tint: "#f4e7fb",
    tintText: "#5a3982",
    shadow: "6px 6px 0 #231b30",
  },
  obsidian: {
    bg: "#000000",
    surface: "#141414",
    surface2: "#242424",
    fg: "#f9f9f9",
    muted: "#a7a7a7",
    border: "#404040",
    primary: "#cf4300",
    onPrimary: "#ffffff",
    tint: "#26140a",
    tintText: "#ff9c66",
    shadow: "0 12px 32px -12px rgba(0,0,0,0.9)",
  },
};

function readThemeTokens(theme?: ExportTheme) {
  if (theme) return EXPORT_PALETTES[theme];
  const cs = typeof document !== "undefined" ? getComputedStyle(document.documentElement) : null;
  const v = (name: string, fallback: string) => cs?.getPropertyValue(name).trim() || fallback;
  return {
    bg: v("--bg", "Canvas"),
    surface: v("--surface", "Canvas"),
    surface2: v("--surface-2", "Canvas"),
    fg: v("--fg", "CanvasText"),
    muted: v("--muted", "GrayText"),
    border: v("--border-strong", "CanvasText"),
    primary: v("--primary", "Highlight"),
    onPrimary: v("--on-primary", "HighlightText"),
    tint: v("--domain-notes-tint", "Canvas"),
    tintText: v("--domain-notes-text", "CanvasText"),
    shadow: v("--shadow-card", "4px 4px 0 CanvasText"),
  };
}

export async function exportNote(note: Note, kind: "md" | "html" | "txt", theme?: ExportTheme): Promise<void> {
  const base = (note.title || "").trim().replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "") || "note";
  if (kind === "md") {
    downloadBlob(`${base}.md`, note.content ?? "", "text/markdown;charset=utf-8");
    return;
  }
  if (kind === "txt") {
    downloadBlob(`${base}.txt`, mdToText(note.content ?? ""), "text/plain;charset=utf-8");
    return;
  }
  const body = await renderMarkdown(note.content ?? "");
  const t = readThemeTokens(theme);
  const tagsHtml = note.tags.map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`).join("");
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(note.title || "StudyQuest Note")}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.css">
<style>
  :root{--bg:${t.bg};--surface:${t.surface};--surface2:${t.surface2};--fg:${t.fg};--muted:${t.muted};--border:${t.border};--primary:${t.primary};--on-primary:${t.onPrimary};--tint:${t.tint};--tint-text:${t.tintText};--shadow:${t.shadow}}
  *{box-sizing:border-box}
  body{margin:0;padding:32px 16px;background:var(--bg);color:var(--fg);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.7}
  .card{max-width:820px;margin:0 auto;background:var(--surface);border:2px solid var(--border);border-radius:28px;box-shadow:var(--shadow);padding:32px 36px}
  .meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:14px;font-size:12px;color:var(--muted)}
  .badge{background:var(--tint);color:var(--tint-text);border:1.5px solid var(--border);border-radius:999px;padding:3px 10px;font-weight:800;font-size:11px}
  .tag{background:var(--surface2);border:1px solid var(--border);border-radius:999px;padding:2px 9px;font-weight:700;font-size:11px;color:var(--fg)}
  h1.title{margin:0 0 18px;font-size:32px;line-height:1.15;letter-spacing:-0.02em}
  hr.div{border:0;border-top:1.5px solid var(--border);opacity:.2;margin:0 0 22px}
  .prose h1,.prose h2,.prose h3{margin:1.3em 0 .45em;line-height:1.25}
  .prose p{margin:.75em 0}
  .prose a{color:var(--tint-text);font-weight:700}
  .prose blockquote,.prose .callout{margin:14px 0;padding:12px 16px;border-left:4px solid var(--border);background:var(--surface2);border-radius:14px}
  .prose .callout-title{font-size:11px;font-weight:800;letter-spacing:.05em;margin-bottom:4px;color:var(--tint-text)}
  .prose pre{overflow:auto;padding:14px 16px;border-radius:16px;border:1.5px solid var(--border);background:var(--surface2);font-size:13px}
  .prose code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.9em;background:var(--surface2);padding:2px 5px;border-radius:6px}
  .prose pre code{background:transparent;padding:0}
  .prose table{width:100%;border-collapse:collapse;margin:14px 0;font-size:14px}
  .prose th,.prose td{border:1.5px solid var(--border);padding:8px 10px;text-align:left}
  .prose th{background:var(--tint);color:var(--tint-text)}
  .prose img{display:block;max-width:100%;height:auto;margin:16px 0;border-radius:16px;border:1.5px solid var(--border)}
</style>
</head>
<body>
  <article class="card">
    <div class="meta">
      <span class="badge">StudyQuest Note</span>
      <span>${new Date(note.updatedAt).toLocaleDateString()}</span>
      ${tagsHtml}
    </div>
    <h1 class="title">${escapeHtml(note.title || "Untitled note")}</h1>
    <hr class="div">
    <div class="prose">${body}</div>
  </article>
</body>
</html>`;
  downloadBlob(`${base}.html`, html, "text/html;charset=utf-8");
}
export type AiAction = "summary" | "flashcards" | "quiz" | "eli5" | "advanced" | "beautify";
export const AI_ACTIONS: { id: AiAction; label: string }[] = [
  { id: "summary", label: "Summarise" }, { id: "flashcards", label: "Make flashcards" }, { id: "quiz", label: "5-question quiz" },
  { id: "eli5", label: "Explain like I'm 5" }, { id: "advanced", label: "Advanced explanation" }, { id: "beautify", label: "Beautify formatting" },
];
function buildLocalCards(note: Note): { front: string; back: string }[] {
  const topics = extractTopics(`${note.title}. ${note.content}`, 8);
  const sentences = mdToText(note.content)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 25);
  return topics.slice(0, 6).map((topic, i) => {
    const match = sentences.find((s) => s.toLowerCase().includes(topic.toLowerCase())) ?? sentences[i] ?? `Review ${topic} in "${note.title}".`;
    return { front: `What is ${topic}?`, back: match.slice(0, 240) };
  });
}

function beautifyLocally(md: string): string {
  return md
    .replace(/\r\n/g, "\n")
    .replace(/^(#{1,3})([^\s#])/gm, "$1 $2")
    .replace(/^\* /gm, "- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Returns the new note content (or null when the result went to flashcards). */
export async function runAiAction(
  action: AiAction,
  note: Note,
  onProgress?: (pct: number) => void
): Promise<{ content: string | null; message: string }> {
  const src = note.content.slice(0, 12000);
  switch (action) {
    case "flashcards": {
      const cards = buildLocalCards(note);
      for (const c of cards) await flashcardsRepo.add({ front: c.front, back: c.back, noteId: note.id, due: Date.now() });
      return { content: null, message: `Saved ${cards.length} flashcards (Local NLP)` };
    }
    case "beautify": {
      return { content: beautifyLocally(note.content), message: "Formatting cleaned (Local)" };
    }
    case "summary": {
      const local = await summarizeWithLocalAi(src, onProgress);
      return { content: `${note.content}\n\n## Local AI summary\n\n${local}\n`, message: "Summary added (Local AI)" };
    }
    case "quiz": {
      const cards = buildLocalCards(note);
      const qs = cards.map((c, i) => `${i + 1}. **${c.front}**`).join("\n");
      const ans = cards.map((c, i) => `${i + 1}. ${c.back}`).join("\n");
      return { content: `${note.content}\n\n## Quick quiz (Local AI)\n\n${qs}\n\n### Answers\n\n${ans}\n`, message: "Quiz generated (Local NLP)" };
    }
    case "eli5": {
      const local = await summarizeWithLocalAi(src, onProgress);
      return { content: `${note.content}\n\n## Explained simply (Local AI)\n\n${local}\n`, message: "Simple summary added (Local AI)" };
    }
    case "advanced": {
      const topics = extractTopics(src, 5);
      const list = topics.map((t) => `- **${t}:** Edge cases, trade-offs, and real-world constraints.`).join("\n");
      return { content: `${note.content}\n\n## Going deeper (Local AI)\n\n${list || "- Explore edge cases and formal proofs."}\n`, message: "Deep-dive prompts added (Local NLP)" };
    }
  }
}
