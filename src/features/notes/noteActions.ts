"use client";
import { emit } from "@/core/events";
import { flashcardsRepo, notesRepo } from "@/core/repos";
import type { Note } from "@/core/types";
import { askAI } from "@/lib/aiClient";
import { renderMarkdown, mdToText } from "@/lib/markdown";
import { downloadBlob } from "@/lib/utils";

export async function importMarkdownFiles(files: FileList | File[]): Promise<string | null> {
  let lastId: string | null = null;
  for (const f of Array.from(files)) {
    if (!/\.(md|markdown|txt)$/i.test(f.name)) continue;
    const text = await f.text();
    const h1 = /^#\s+(.+)$/m.exec(text);
    const title = h1 ? h1[1].trim() : f.name.replace(/\.\w+$/, "");
    const n = await notesRepo.add({ title, content: text, tags: ["imported"] });
    emit("note.created", { title });
    lastId = n.id;
  }
  return lastId;
}
export async function exportNote(note: Note, kind: "md" | "html" | "txt"): Promise<void> {
  const base = (note.title || "note").replace(/[^\w-]+/g, "_");
  if (kind === "md") downloadBlob(`${base}.md`, note.content, "text/markdown");
  else if (kind === "txt") downloadBlob(`${base}.txt`, mdToText(note.content));
  else {
    const body = await renderMarkdown(note.content);
    downloadBlob(`${base}.html`, `<!doctype html><meta charset="utf-8"><title>${note.title}</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.css"><body style="font-family:system-ui;max-width:760px;margin:40px auto;line-height:1.7;padding:0 16px">${body}</body>`, "text/html");
  }
}
export type AiAction = "summary" | "flashcards" | "quiz" | "eli5" | "advanced" | "beautify";
export const AI_ACTIONS: { id: AiAction; label: string }[] = [
  { id: "summary", label: "Summarise" }, { id: "flashcards", label: "Make flashcards" }, { id: "quiz", label: "5-question quiz" },
  { id: "eli5", label: "Explain like I'm 5" }, { id: "advanced", label: "Advanced explanation" }, { id: "beautify", label: "Beautify formatting" },
];
const SYS = "You are a study assistant. Reply in clean Markdown only, no preamble.";
/** Returns the new note content (or null when the result went to flashcards). */
export async function runAiAction(action: AiAction, note: Note): Promise<{ content: string | null; message: string }> {
  const src = note.content.slice(0, 12000);
  switch (action) {
    case "flashcards": {
      const raw = await askAI(`Create 8 flashcards from these notes. Reply with ONLY a JSON array of {"front":string,"back":string}.\n\n${src}`, "You output strict JSON only.");
      const json = /\[[\s\S]*\]/.exec(raw)?.[0] ?? "[]";
      const cards = (JSON.parse(json) as { front: string; back: string }[]).filter((c) => c.front && c.back);
      for (const c of cards) await flashcardsRepo.add({ front: c.front, back: c.back, noteId: note.id, due: Date.now() });
      return { content: null, message: `Saved ${cards.length} flashcards` };
    }
    case "beautify": return { content: await askAI(`Reformat these notes with clear headings, lists, tables and callouts. Keep every fact. Return the full note.\n\n${src}`, SYS), message: "Formatting updated" };
    case "summary": return { content: `${note.content}\n\n## AI summary\n\n${await askAI(`Summarise in 5 bullet points:\n\n${src}`, SYS)}\n`, message: "Summary added" };
    case "quiz": return { content: `${note.content}\n\n## Quick quiz\n\n${await askAI(`Write a 5-question quiz with answers hidden under an "Answers" heading at the end:\n\n${src}`, SYS)}\n`, message: "Quiz added" };
    case "eli5": return { content: `${note.content}\n\n## Explained simply\n\n${await askAI(`Explain these notes like I'm five, with an analogy:\n\n${src}`, SYS)}\n`, message: "Simple explanation added" };
    case "advanced": return { content: `${note.content}\n\n## Going deeper\n\n${await askAI(`Give an advanced, rigorous extension of these notes for an expert reader:\n\n${src}`, SYS)}\n`, message: "Advanced section added" };
  }
}
