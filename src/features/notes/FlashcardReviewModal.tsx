"use client";
import { useState } from "react";
import NumberFlow from "@number-flow/react";
import { useDrag } from "@use-gesture/react";
import { ArrowsClockwise, Cards } from "@phosphor-icons/react";
import { LottieBadge } from "@/components/ui/LottieBadge";
import { Modal } from "@/components/ui/modal";
import { flashcardsRepo } from "@/core/repos";
import { useRows } from "@/features/shared/hooks";
import { previewIntervals, scheduleFlashcard, type StudyGrade } from "@/lib/fsrs";

const GRADES: { id: StudyGrade; label: string; tone: string }[] = [
  { id: "again", label: "Again", tone: "bg-[var(--danger-tint)] text-[var(--danger-text)]" },
  { id: "hard", label: "Hard", tone: "bg-[var(--warning-tint)] text-[var(--warning-text)]" },
  { id: "good", label: "Good", tone: "bg-[var(--info-tint)] text-[var(--info-text)]" },
  { id: "easy", label: "Easy", tone: "bg-[var(--success-tint)] text-[var(--success-text)]" },
];

export function FlashcardReviewModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const cards = useRows(flashcardsRepo) ?? [];
  const [flipped, setFlipped] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [dragX, setDragX] = useState(0);
  const due = cards.filter((c) => c.due <= now).sort((a, b) => a.due - b.due);
  const current = due[0];

  const rate = async (grade: StudyGrade) => {
    if (!current) return;
    const next = scheduleFlashcard(current, grade);
    await flashcardsRepo.update(current.id, { due: next.due, fsrs: next.fsrs });
    setFlipped(false);
    setDragX(0);
    setNow(Date.now());
  };

  const bindDrag = useDrag(
    ({ active, movement: [mx], tap }) => {
      if (tap) {
        setFlipped((v) => !v);
        return;
      }
      if (active) {
        setDragX(mx);
      } else {
        if (mx > 85) void rate("good");
        else if (mx < -85) void rate("again");
        setDragX(0);
      }
    },
    { filterTaps: true, axis: "x" }
  );

  const intervals = current ? previewIntervals(current) : null;

  return (
    <Modal open={open} onClose={onClose} title="Spaced Repetition (FSRS)">
      {!current ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <LottieBadge size={56} />
          <p className="text-sm font-extrabold">All caught up!</p>
          <p className="text-xs text-muted max-w-xs">
            {cards.length === 0
              ? 'Generate flashcards from any note using "Make flashcards" in AI actions.'
              : `All ${cards.length} flashcards are scheduled ahead.`}
          </p>
          <button type="button" className="btn btn-sm" onClick={() => setNow(Date.now())}>
            <ArrowsClockwise size={14} /> Refresh due queue
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs text-muted font-bold">
            <span className="inline-flex items-center gap-1.5">
              <Cards size={14} weight="duotone" /> Due now:{" "}
              <NumberFlow value={due.length} className="num text-fg font-extrabold" />
            </span>
            <span className="text-[11px] text-muted">Swipe ← Again · → Good</span>
          </div>

          <div
            {...bindDrag()}
            style={{
              transform: `translateX(${dragX}px) rotate(${dragX * 0.04}deg)`,
              touchAction: "pan-y",
            }}
            className="min-h-40 w-full cursor-grab active:cursor-grabbing rounded-2xl border-[1.5px] border-border-strong bg-surface p-5 text-left transition-shadow hover:bg-surface-2 select-none"
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted">
              {flipped ? "Answer" : "Prompt (tap to flip)"}
            </span>
            <p className="mt-2 text-base font-bold text-fg whitespace-pre-wrap">
              {flipped ? current.back : current.front}
            </p>
          </div>

          {flipped && intervals ? (
            <div className="grid grid-cols-4 gap-2">
              {GRADES.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => void rate(g.id)}
                  className={`flex flex-col items-center rounded-xl border border-line/40 px-2 py-2 text-xs font-extrabold transition hover:scale-[1.02] ${g.tone}`}
                >
                  <span>{g.label}</span>
                  <span className="text-[10px] opacity-80 num">{intervals[g.id]}</span>
                </button>
              ))}
            </div>
          ) : (
            <button type="button" className="btn btn-lime" onClick={() => setFlipped(true)}>
              Show answer
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
