"use client";
import { useEffect, useState } from "react";
import { Heart, Skull } from "@phosphor-icons/react";
import { HeroCard } from "@/components/ui/design-primitives";
import { ProgressBar } from "@/components/ui/misc";
import { scoresRepo } from "@/core/repos";
import { QUESTIONS } from "@/content/questions";
import { payout } from "./arcadeUtils";

function pickQuestions() {
  return [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 8);
}

const BADGES = [
  { letter: "A", bg: "bg-primary text-on-primary", edge: "border-l-lime" },
  { letter: "B", bg: "bg-lavender text-ink", edge: "border-l-violet" },
  { letter: "C", bg: "bg-peach text-ink", edge: "border-l-orange" },
  { letter: "D", bg: "bg-teal/40 text-ink", edge: "border-l-teal" },
];

export function TriviaDungeon() {
  const [qs, setQs] = useState(() => QUESTIONS.slice(0, 8));
  const [i, setI] = useState(0);
  const [hp, setHp] = useState(100);
  const [lives, setLives] = useState(3);
  const [picked, setPicked] = useState<number | null>(null);
  const [dmgPop, setDmgPop] = useState<string | null>(null);
  const [end, setEnd] = useState<null | { won: boolean; paid: number }>(null);

  useEffect(() => {
    setQs(pickQuestions());
  }, []);

  const q = qs[i % qs.length];
  const reset = () => {
    setQs(pickQuestions());
    setI(0);
    setHp(100);
    setLives(3);
    setPicked(null);
    setDmgPop(null);
    setEnd(null);
  };

  async function answer(k: number) {
    if (picked !== null || end) return;
    setPicked(k);
    const right = k === q.answer;
    const nhp = right ? Math.max(0, hp - 34) : hp;
    const nl = right ? lives : lives - 1;
    setHp(nhp);
    setLives(nl);
    setDmgPop(right ? "-34 HP!" : "-1 Heart");
    setTimeout(async () => {
      setPicked(null);
      setDmgPop(null);
      if (nhp <= 0) {
        const paid = await payout(35);
        await scoresRepo.add({ game: "trivia", score: lives * 10 + 30 });
        setEnd({ won: true, paid });
      } else if (nl <= 0) {
        setEnd({ won: false, paid: 0 });
      } else {
        setI(i + 1);
      }
    }, 700);
  }

  return (
    <HeroCard
      tint="ink"
      title="Trivia Dungeon"
      subtitle="Right answers hurt the monster. Wrong ones hurt you."
      action={
        <span className="flex items-center gap-0.5">
          {Array.from({ length: 3 }, (_, n) => (
            <Heart key={n} size={22} weight={n < lives ? "fill" : "regular"} className="text-[var(--danger)]" />
          ))}
        </span>
      }
      className="h-full"
    >
      <div className="flex h-full min-h-0 flex-col justify-between gap-4">
        {/* Monster card */}
        <div
          className={`relative flex items-center gap-4 rounded-[24px] border-[1.5px] border-line bg-soft p-3.5 shadow-xs shrink-0 transition-transform duration-150 ${
            dmgPop?.startsWith("-") && dmgPop.includes("HP") ? "scale-x-105 scale-y-90" : ""
          }`}
        >
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl border border-line bg-[var(--domain-play-tint)] text-[var(--domain-play-fill)]">
            <Skull size={34} weight="duotone" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <p className="font-display text-sm font-extrabold">Bug Golem</p>
              <span className="font-display num text-xs font-extrabold text-[var(--danger)]">{hp} / 100 HP</span>
            </div>
            <ProgressBar pct={hp / 100} color="var(--danger)" />
          </div>
          {dmgPop && (
            <span className="pop-in absolute -top-3 right-4 rounded-full border border-ink bg-lime px-2.5 py-0.5 font-display text-xs font-extrabold text-ink shadow-sm">
              {dmgPop}
            </span>
          )}
        </div>

        {end ? (
          <div className="grid flex-1 place-items-center text-center">
            <div>
              <p className="font-display text-4xl font-extrabold">{end.won ? "Monster defeated" : "You fell"}</p>
              <p className="mt-1 text-sm text-muted">
                {end.won ? `+${end.paid} coins${end.paid === 0 ? " (daily cap reached)" : ""}` : "Review and try again."}
              </p>
              <button className="btn btn-lime mt-4" onClick={reset}>
                Enter again
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col justify-center gap-4">
            <p className="font-display text-xl sm:text-2xl font-extrabold leading-snug">{q.q}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {q.options.map((o, k) => {
                const badge = BADGES[k % BADGES.length];
                const stateCls =
                  picked === null
                    ? "border-line/40 bg-surface hover:border-ink hover:-translate-y-0.5"
                    : k === q.answer
                    ? "border-border-strong bg-primary text-on-primary scale-[1.03]"
                    : picked === k
                    ? "border-border-strong bg-[var(--danger-tint)] text-[var(--danger-text)] -translate-x-1"
                    : "border-line/20 bg-surface/60 opacity-60";
                return (
                  <button
                    key={o}
                    onClick={() => void answer(k)}
                    className={`flex min-h-16 items-center gap-3 rounded-[20px] border-[1.5px] border-l-4 ${badge.edge} p-3 text-left text-sm font-bold transition active:scale-[0.98] cursor-pointer ${stateCls}`}
                  >
                    <span className={`grid size-8 shrink-0 place-items-center rounded-xl border border-ink/30 font-display text-xs font-extrabold ${badge.bg}`}>
                      {badge.letter}
                    </span>
                    <span className="line-clamp-2 leading-tight">{o}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </HeroCard>
  );
}
