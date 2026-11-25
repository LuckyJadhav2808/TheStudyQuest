"use client";
import nspell from "nspell";

export type SpellChecker = ReturnType<typeof nspell>;

const IGNORE_KEY = "sq-spell-ignore";
let cached: SpellChecker | null = null;
let loading: Promise<SpellChecker> | null = null;

function readIgnored(): string[] {
  try {
    const raw = localStorage.getItem(IGNORE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function getCachedSpellchecker(): SpellChecker | null {
  return cached;
}

export async function getSpellchecker(): Promise<SpellChecker> {
  if (cached) return cached;
  if (loading) return loading;
  loading = Promise.all([
    fetch("/dict/en.aff").then((r) => r.text()),
    fetch("/dict/en.dic").then((r) => r.text()),
  ]).then(([aff, dic]) => {
    const checker = nspell(aff, dic);
    for (const w of readIgnored()) checker.add(w);
    cached = checker;
    return checker;
  });
  return loading;
}

export function ignoreSpellWord(word: string) {
  const clean = word.trim();
  if (!clean) return;
  cached?.add(clean);
  try {
    const cur = readIgnored();
    if (!cur.includes(clean)) {
      localStorage.setItem(IGNORE_KEY, JSON.stringify([...cur.slice(-200), clean]));
    }
  } catch {
    /* ignore */
  }
}
