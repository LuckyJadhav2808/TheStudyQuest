"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { Panels } from "@/components/shell/Panels";
import { BentoCard } from "@/components/shell/BentoCard";
import { Empty, PageFrame, ProgressBar } from "@/components/ui/misc";
import { db } from "@/core/db";
import { useGame } from "@/core/settings";
import { todayKey } from "@/lib/utils";
import { DAILY_CAP } from "./arcadeUtils";
import { PetCatch } from "./PetCatch";
import { TriviaDungeon } from "./TriviaDungeon";

function Board() {
  const rows = useLiveQuery(() => db.scores.toArray(), [], []);
  const g = useGame();
  const top = (game: string) => rows.filter((r) => r.game === game).sort((a, b) => b.score - a.score).slice(0, 3);
  const used = g.arcadeToday.date === todayKey() ? g.arcadeToday.coins : 0;
  return (
    <BentoCard
      title="Leaderboard"
      action={<span className="chip !min-h-7 text-[11px] font-bold num">{used}/{DAILY_CAP} coins</span>}
      className="h-full"
    >
      <div className="flex h-full min-h-0 flex-col gap-3">
        <ProgressBar pct={used / DAILY_CAP} color="var(--color-orange)" />
        <div className="scroll-thin min-h-0 flex-1 space-y-2.5">
          {rows.length === 0 ? (
            <Empty title="No scores yet" hint="Play a game to claim the top spot." />
          ) : (
            ([["trivia", "Trivia Dungeon"], ["petcatch", "Pet Catch"]] as const).map(([k, l]) => (
              <div key={k}>
                <p className="mb-1 text-xs font-extrabold uppercase tracking-wider text-muted">{l}</p>
                {top(k).length === 0 ? (
                  <p className="text-xs text-muted">No runs yet.</p>
                ) : (
                  top(k).map((r, i) => (
                    <div key={r.id} className="tile mb-1 flex justify-between !py-1.5 text-xs">
                      <span className="font-bold">#{i + 1}</span>
                      <span className="num font-bold">{r.score}</span>
                    </div>
                  ))
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </BentoCard>
  );
}

export function ArcadePage() {
  const rightCol = (
    <div style={{ gap: "var(--gutter, 16px)" }} className="flex h-full min-h-0 flex-col">
      <div className="flex-1 min-h-0">
        <PetCatch />
      </div>
      <div className="flex-1 min-h-0">
        <Board />
      </div>
    </div>
  );

  return (
    <PageFrame title="Arcade" subtitle="Quick games that pay a few coins a day.">
      <Panels
        className="lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)]"
        panels={[
          { id: "t", label: "Trivia", className: "lg:col-span-7", node: <TriviaDungeon /> },
          { id: "r", label: "Pet Catch & Scores", className: "lg:col-span-5", node: rightCol },
        ]}
      />
    </PageFrame>
  );
}
