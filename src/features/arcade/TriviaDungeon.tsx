"use client";
import { useMemo, useState } from "react";
import { Heart, Skull } from "@phosphor-icons/react";
import { Card, CardTitle, ProgressBar } from "@/components/ui/misc";
import { scoresRepo } from "@/core/repos";
import { QUESTIONS } from "@/content/questions";
import { payout } from "./arcadeUtils";

export function TriviaDungeon() {
  const [run, setRun] = useState(0);
  const qs = useMemo(() => [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 8), [run]);
  const [i, setI] = useState(0);
  const [hp, setHp] = useState(100);
  const [lives, setLives] = useState(3);
  const [picked, setPicked] = useState<number | null>(null);
  const [end, setEnd] = useState<null | { won: boolean; paid: number }>(null);
  const q = qs[i % qs.length];
  const reset = () => { setRun((r) => r + 1); setI(0); setHp(100); setLives(3); setPicked(null); setEnd(null); };
  async function answer(k: number) {
    if (picked !== null || end) return;
    setPicked(k);
    const right = k === q.answer;
    const nhp = right ? Math.max(0, hp - 34) : hp, nl = right ? lives : lives - 1;
    setHp(nhp); setLives(nl);
    setTimeout(async () => {
      setPicked(null);
      if (nhp <= 0) { const paid = await payout(35); await scoresRepo.add({ game: "trivia", score: lives * 10 + 30 }); setEnd({ won: true, paid }); }
      else if (nl <= 0) setEnd({ won: false, paid: 0 });
      else setI(i + 1);
    }, 700);
  }
  return (
    <Card className="gap-3">
      <CardTitle sub="Right answers hurt the monster. Wrong ones hurt you." right={<span className="flex">{Array.from({ length: 3 }, (_, n) => <Heart key={n} size={22} weight={n < lives ? "fill" : "regular"} className="text-red-500" />)}</span>}>Trivia Dungeon</CardTitle>
      <div className="tile flex items-center gap-3"><Skull size={36} weight="duotone" /><div className="flex-1"><p className="text-xs font-bold">Bug Golem · {hp} HP</p><ProgressBar pct={hp / 100} color="#FF5A4A" /></div></div>
      {end ? (
        <div className="grid flex-1 place-items-center text-center"><div><p className="font-display text-4xl">{end.won ? "Monster defeated" : "You fell"}</p><p className="mt-1 text-sm text-muted">{end.won ? `+${end.paid} coins${end.paid === 0 ? " (daily cap reached)" : ""}` : "Review and try again."}</p><button className="btn btn-lime mt-3" onClick={reset}>Enter again</button></div></div>
      ) : (
        <div className="scroll-thin min-h-0 flex-1 space-y-2"><p className="font-display text-xl">{q.q}</p>{q.options.map((o, k) => <button key={o} onClick={() => void answer(k)} className={`tile flex min-h-12 w-full items-center border-[1.5px] text-left font-semibold ${picked === null ? "border-transparent" : k === q.answer ? "border-line bg-lime text-ink" : picked === k ? "border-line bg-red-300 text-ink" : "border-transparent"}`}>{o}</button>)}</div>
      )}
    </Card>
  );
}
