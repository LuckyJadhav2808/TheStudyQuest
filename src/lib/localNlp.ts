import nlp from "compromise";
import { addDays } from "date-fns";
import type { Priority } from "@/core/types";
import { todayKey } from "@/lib/utils";

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#>*_`~[\]()$-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extracts top clean concept/topic phrases from text using compromise NLP. */
export function extractTopics(text: string, limit = 4): string[] {
  const clean = stripMarkdown(text).slice(0, 4000);
  if (!clean) return [];
  const doc = nlp(clean);
  const raw = [
    ...(doc.topics().out("array") as string[]),
    ...(doc.nouns().out("array") as string[]),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const phrase = item.replace(/[^a-zA-Z0-9\s-]/g, "").trim();
    const key = phrase.toLowerCase();
    if (phrase.length < 3 || phrase.length > 28 || seen.has(key)) continue;
    seen.add(key);
    out.push(phrase);
    if (out.length >= limit) break;
  }
  return out;
}

/** Suggests clean lowercase #tag slugs from note content. */
export function suggestTags(content: string, existingTags: string[], limit = 4): string[] {
  const existing = new Set(existingTags.map((t) => t.toLowerCase()));
  const topics = extractTopics(content, limit * 2);
  const out: string[] = [];
  for (const t of topics) {
    const slug = t.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (slug.length >= 3 && !existing.has(slug) && !out.includes(slug)) {
      out.push(slug);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** Generates a concept-specific active-recall question offline using compromise NLP. */
export function generateLocalStudyQuestion(title: string, content: string): string {
  const topics = extractTopics(`${title}. ${content}`, 3);
  if (topics.length >= 2) {
    return `How does ${topics[0]} relate to ${topics[1]}, and what is one concrete example of each?`;
  }
  if (topics.length === 1) {
    return `Without looking back, how would you explain ${topics[0]} in 3 bullet points?`;
  }
  const fallback = title.trim() && title !== "Untitled note" ? title.trim() : "this note";
  return `What is the core idea behind ${fallback}, and why does it matter?`;
}

/** Parses natural-language task strings (e.g. "Revise OS tomorrow urgent") into structured fields. */
export function parseQuickTask(input: string): { title: string; priority?: Priority; due?: string } {
  let text = input.trim();
  let priority: Priority | undefined;
  let due: string | undefined;

  if (/\b(urgent|asap|critical)\b/i.test(text)) {
    priority = "urgent";
    text = text.replace(/\b(urgent|asap|critical)\b/gi, "");
  } else if (/\b(high|important)\b/i.test(text)) {
    priority = "high";
    text = text.replace(/\b(high|important)\b/gi, "");
  } else if (/\b(low|later)\b/i.test(text)) {
    priority = "low";
    text = text.replace(/\b(low|later)\b/gi, "");
  }

  if (/\btoday\b/i.test(text)) {
    due = todayKey();
    text = text.replace(/\btoday\b/gi, "");
  } else if (/\btomorrow\b/i.test(text)) {
    due = todayKey(addDays(new Date(), 1));
    text = text.replace(/\btomorrow\b/gi, "");
  }

  const cleaned = text.replace(/\s+/g, " ").trim();
  return { title: cleaned || input.trim(), priority, due };
}

/** Builds a dynamic topic-aware Strobi toast line. */
export function dynamicToastLine(prefix: string, sourceText: string): string {
  const topic = extractTopics(sourceText, 1)[0];
  return topic ? `${prefix} — ${topic}` : prefix;
}
