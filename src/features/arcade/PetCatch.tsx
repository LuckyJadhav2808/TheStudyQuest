"use client";
import { useEffect, useRef, useState } from "react";
import { Card, CardTitle } from "@/components/ui/misc";
import { scoresRepo } from "@/core/repos";
import { payout } from "./arcadeUtils";

interface Critter { x: number; y: number; r: number; born: number; life: number; color: string }
const W = 360, H = 260, DURATION = 20000, COLORS = ["#D9FF45", "#FF8B4A", "#1FD6C1", "#B9A6FF"];
export function PetCatch() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"idle" | "play" | "done">("idle");
  const [score, setScore] = useState(0);
  const [paid, setPaid] = useState(0);
  const critters = useRef<Critter[]>([]);
  const scoreRef = useRef(0);

  useEffect(() => {
    if (state !== "play") return;
    const c = ref.current, ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const start = performance.now();
    let raf = 0, lastSpawn = 0;
    scoreRef.current = 0; critters.current = [];
    const loop = (t: number) => {
      const el = t - start;
      if (el > DURATION) { setScore(scoreRef.current); setState("done"); return; }
      if (t - lastSpawn > 650) { lastSpawn = t; critters.current.push({ x: 30 + Math.random() * (W - 60), y: 40 + Math.random() * (H - 70), r: 20 + Math.random() * 10, born: t, life: 1100, color: COLORS[Math.floor(Math.random() * 4)] }); }
      critters.current = critters.current.filter((k) => t - k.born < k.life);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#F5F5F2"; ctx.fillRect(0, 0, W, H);
      critters.current.forEach((k) => { const a = 1 - (t - k.born) / k.life; ctx.globalAlpha = Math.max(0.3, a); ctx.fillStyle = k.color; ctx.strokeStyle = "#0b0b0c"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(k.x, k.y, k.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#fff"; ctx.fillRect(k.x - 6, k.y - 8, 4, 12); ctx.fillRect(k.x + 3, k.y - 8, 4, 12); ctx.globalAlpha = 1; });
      ctx.fillStyle = "#0b0b0c"; ctx.font = "bold 14px sans-serif"; ctx.fillText(`Score ${scoreRef.current}   Time ${Math.ceil((DURATION - el) / 1000)}s`, 10, 20);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state]);
  useEffect(() => { if (state === "done") { void payout(Math.floor(score / 2)).then(setPaid); void scoresRepo.add({ game: "petcatch", score }); } }, [state, score]);
  const hit = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
    const idx = critters.current.findIndex((k) => Math.hypot(k.x - x, k.y - y) < k.r + 4);
    if (idx >= 0) { critters.current.splice(idx, 1); scoreRef.current += 1; }
  };
  return (
    <Card className="items-center gap-3">
      <CardTitle sub="Tap the critters before they vanish. 20 seconds.">Pet Catch</CardTitle>
      <canvas ref={ref} width={W} height={H} onPointerDown={hit} aria-label="Pet Catch game area" className="max-h-full w-full max-w-md touch-none rounded-[24px] border-[1.5px] border-line bg-paper" />
      {state !== "play" && <div className="text-center">{state === "done" && <p className="mb-2 font-display text-xl" role="status">Caught {score}. {paid > 0 ? `+${paid} coins` : "No coins (cap reached or score too low)"}</p>}<button className="btn btn-lime" onClick={() => { setPaid(0); setState("play"); }}>{state === "done" ? "Play again" : "Start"}</button></div>}
    </Card>
  );
}
