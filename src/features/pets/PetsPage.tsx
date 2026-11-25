"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { Panels } from "@/components/shell/Panels";
import { BentoCard } from "@/components/shell/BentoCard";
import { EmptyState, HeroCard } from "@/components/ui/design-primitives";
import { PageFrame } from "@/components/ui/misc";
import { gameRepo, petsRepo } from "@/core/repos";
import { useGame } from "@/core/settings";
import { useRows } from "@/features/shared/hooks";
import { strobiSay } from "@/features/strobi/toast";
import { PetPanel } from "./PetPanel";
import { PetSprite } from "./PetSprite";
import { SPECIES } from "./petLogic";

const EGG_COST = 100;
export async function adoptEgg(species: string, name: string, free: boolean): Promise<boolean> {
  const g = await gameRepo.get();
  if (!free && g.coins < EGG_COST) { strobiSay("An egg costs 100 coins.", "error"); return false; }
  if (!free) await gameRepo.mutate((x) => ({ ...x, coins: x.coins - EGG_COST }));
  const existing = (await petsRepo.active()).length;
  await petsRepo.add({ species, name, stage: 0, hunger: 80, happiness: 70, energy: 100, feedings: 0, lastTick: Date.now(), active: existing === 0 });
  return true;
}
export function PetsPage() {
  const pets = useRows(petsRepo) ?? [];
  const g = useGame();
  const [sel, setSel] = useState<string | null>(null);
  const cur = pets.find((p) => p.id === sel) ?? pets.find((p) => p.active) ?? pets[0];
  const collection = (
    <BentoCard title="Collection" subtitle={`${pets.length} collected`} className="h-full">
      <div className="scroll-thin min-h-0 flex-1 space-y-2">
        {pets.map((p) => (
          <button
            key={p.id}
            onClick={() => setSel(p.id)}
            className={`relative tile flex w-full items-center gap-3 border-[1.5px] text-left transition ${
              cur?.id === p.id ? "border-border-strong text-on-primary" : "border-transparent hover:bg-[var(--domain-play-tint)]/50"
            }`}
          >
            {cur?.id === p.id && (
              <motion.span
                layoutId="active-pet-pill"
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
                className="absolute inset-0 rounded-[24px] bg-primary -z-0"
              />
            )}
            <span className="relative z-10 flex w-full items-center gap-3">
              <PetSprite species={p.species} stage={p.stage} size={48} />
              <span className="flex-1 font-bold">{p.name}</span>
              {p.active && <span className="chip !min-h-6 text-[11px]">Companion</span>}
            </span>
          </button>
        ))}
        <p className="pt-2 text-xs font-bold text-muted">Adopt an egg (100 coins{pets.length === 0 ? ", first one free" : ""})</p>
        <div className="grid grid-cols-2 gap-2">{SPECIES.map((s) => <button key={s.id} className="tile flex items-center gap-2 text-left text-sm font-bold hover:bg-[var(--domain-play-tint)]/50 transition" disabled={pets.length > 0 && g.coins < EGG_COST} onClick={() => void adoptEgg(s.id, s.name, pets.length === 0)}><PetSprite species={s.id} stage={0} size={36} />{s.name}<span className="text-[11px] font-normal text-muted">{s.kind}</span></button>)}</div>
      </div>
    </BentoCard>
  );
  const stage = (
    <HeroCard
      tint="play"
      hardShadow
      title={cur ? "Habitat" : undefined}
      action={cur && !cur.active ? <button className="btn btn-sm" onClick={async () => { for (const p of pets) await petsRepo.update(p.id, { active: p.id === cur.id }); }}>Make companion</button> : undefined}
      scrollable
      className="h-full"
    >
      {cur ? <PetPanel pet={cur} /> : <EmptyState title="No pets yet" hint="Pick an egg on the left. The first one is free." mood="happy" ghostCount={2} ghostLabel="Companion" />}
    </HeroCard>
  );
  return (
    <PageFrame title="Pets" subtitle="Collectible companions. They grow as you study.">
      <Panels className="lg:grid-cols-12" panels={[{ id: "c", label: "Collection", className: "lg:col-span-4", node: collection }, { id: "s", label: "Habitat", className: "lg:col-span-8", node: stage }]} />
    </PageFrame>
  );
}
