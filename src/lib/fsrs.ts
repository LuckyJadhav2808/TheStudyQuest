import { createEmptyCard, formatDate, fsrs, generatorParameters, Rating, type Card, type Grade } from "ts-fsrs";
import type { Flashcard } from "@/core/types";

const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

export type StudyGrade = "again" | "hard" | "good" | "easy";

const GRADE_MAP: Record<StudyGrade, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

function toFsrsCard(card: Flashcard): Card {
  if (card.fsrs && typeof card.fsrs === "object") {
    const raw = card.fsrs as Record<string, unknown>;
    return {
      ...createEmptyCard(new Date(card.due || Date.now())),
      ...raw,
      due: new Date((raw.due as string | number | undefined) ?? card.due ?? Date.now()),
      last_review: raw.last_review ? new Date(raw.last_review as string | number) : undefined,
    } as Card;
  }
  return createEmptyCard(new Date(card.due || Date.now()));
}

function formatInterval(ms: number): string {
  const mins = Math.max(1, Math.round(ms / 60_000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  return `${months}mo`;
}

export function previewIntervals(card: Flashcard, now = new Date()): Record<StudyGrade, string> {
  const base = toFsrsCard(card);
  const res = scheduler.repeat(base, now);
  return {
    again: formatInterval(res[Rating.Again].card.due.getTime() - now.getTime()),
    hard: formatInterval(res[Rating.Hard].card.due.getTime() - now.getTime()),
    good: formatInterval(res[Rating.Good].card.due.getTime() - now.getTime()),
    easy: formatInterval(res[Rating.Easy].card.due.getTime() - now.getTime()),
  };
}

export function scheduleFlashcard(card: Flashcard, grade: StudyGrade, now = new Date()) {
  const base = toFsrsCard(card);
  const outcome = scheduler.next(base, now, GRADE_MAP[grade]);
  const next = outcome.card;
  return {
    due: next.due.getTime(),
    dueFormatted: formatDate(next.due),
    fsrs: {
      ...next,
      due: next.due.toISOString(),
      last_review: next.last_review ? next.last_review.toISOString() : now.toISOString(),
    } as Record<string, unknown>,
  };
}
