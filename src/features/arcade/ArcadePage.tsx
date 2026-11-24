"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { Panels } from "@/components/shell/Panels";
import { Card, CardTitle, Empty, PageFrame } from "@/components/ui/misc";
import { db } from "@/core/db";
import { useGame } from "@/core/settings";
import { todayKey } from "@/lib/utils";
import { DAILY_CAP } from "./arcadeUtils";
import { PetCatch } from "./PetCatch";
import { TriviaDungeon } from "./TriviaDungeon";

function Board() {
  const rows = useLiveQuery(() => db.scores.toArray(), [], []);
  const g = useGame();
  const top = (game: string) => rows.filter((r) => r.game === game).sort((a, b) => b.score - a.score).slice(0, 5);
  const used = g.arcadeToday.date === todayKey() ? g.arcadeToday.coins : 0;
  return (
    <Card className="gap-3">
      <CardTitle sub={`Daily coin cap: ${used}/${DAILY_CAP}`}>Leaderboard</CardTitle>
      <div className="scroll-thin min-h-0 flex-1 space-y-3">
        {([["trivia", "Trivia Dungeon"], ["petcatch", "Pet Catch"]] as const).map(([k, l]) => (
          <div key={k}><p className="mb-1 text-sm font-bold">{l}</p>{top(k).length === 0 ? <p className="text-xs text-muted">No runs yet.</p> : top(k).map((r, i) => <div key={r.id} className="tile mb-1 flex justify-between !py-2 text-sm"><span className="font-bold">#{i + 1}</span><span className="num">{r.score}</span></div>)}</div>
        ))}
        {rows.length === 0 && <Empty title="No scores yet" hint="Play a game to claim the top spot." />}
      </div>
    </Card>
  );
}
export function ArcadePage() {
  return (
    <PageFrame title="Arcade" subtitle="Quick games that pay a few coins a day.">
      <Panels className="lg:grid-cols-12" panels={[{ id: "t", label: "Trivia", className: "lg:col-span-5", node: <TriviaDungeon /> }, { id: "p", label: "Pet Catch", className: "lg:col-span-4", node: <PetCatch /> }, { id: "b", label: "Scores", className: "lg:col-span-3", node: <Board /> }]} />
    </PageFrame>
  );
}
