"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { Cookie, GameController, Moon, Sparkle } from "@phosphor-icons/react";
import { ProgressBar } from "@/components/ui/misc";
import { db } from "@/core/db";
import { emit } from "@/core/events";
import { gameRepo, inventoryRepo, petsRepo } from "@/core/repos";
import { useGame } from "@/core/settings";
import type { Pet } from "@/core/types";
import { SHOP, getItem } from "@/content/play";
import { strobiSay } from "@/features/strobi/toast";
import { clamp } from "@/lib/utils";
import { PetSprite } from "./PetSprite";
import { STAGES, canEvolve, decayed, moodOf, progressFor } from "./petLogic";

export async function tickPets(slow: number): Promise<void> {
  const now = Date.now();
  for (const p of await db.pets.toArray()) { const n = decayed(p, now, slow); if (n !== p) await db.pets.put(n); }
}
export function useSlow(): number {
  const skills = useLiveQuery(() => db.skills.toArray(), [], []);
  return skills.some((s) => s.id === "b3") ? 0.3 : skills.some((s) => s.id === "b1") ? 0.15 : 0;
}
export function PetPanel({ pet, compact = false }: { pet: Pet; compact?: boolean }) {
  const g = useGame();
  const slow = useSlow();
  const inv = useLiveQuery(() => db.inventory.toArray(), [], []);
  useEffect(() => { void tickPets(slow); }, [slow]);
  const foods = inv.filter((i) => i.qty > 0 && getItem(i.itemId)?.cat === "food");
  const feed = async (itemId: string | null) => {
    const it = getItem(itemId ?? "kibble");
    if (!it) return;
    if (itemId) { const row = inv.find((i) => i.itemId === itemId); if (!row) return; if (row.qty <= 1) await inventoryRepo.remove(row.id); else await inventoryRepo.update(row.id, { qty: row.qty - 1 }); }
    else { if (g.coins < it.price) return strobiSay("Not enough coins for a snack.", "error"); await gameRepo.mutate((x) => ({ ...x, coins: x.coins - it.price })); }
    await petsRepo.update(pet.id, { hunger: clamp(pet.hunger + (it.hunger ?? 0), 0, 100), happiness: clamp(pet.happiness + (it.happy ?? 0), 0, 100), feedings: pet.feedings + 1, lastTick: Date.now() });
    emit("pet.fed", { petName: pet.name });
  };
  const play = () => { if (pet.energy < 15) return strobiSay(`${pet.name} is too tired. Let it nap.`, "tip"); void petsRepo.update(pet.id, { happiness: clamp(pet.happiness + 15, 0, 100), energy: clamp(pet.energy - 15, 0, 100), lastTick: Date.now() }); };
  const nap = () => void petsRepo.update(pet.id, { energy: 100, hunger: clamp(pet.hunger - 8, 0, 100), lastTick: Date.now() });
  const evolve = async () => { await petsRepo.update(pet.id, { stage: pet.stage + 1, happiness: 100 }); strobiSay(`${pet.name} evolved into a ${STAGES[pet.stage + 1]}!`, "levelup"); };
  const prog = progressFor(pet, g);
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex items-center gap-4">
        <PetSprite species={pet.species} stage={pet.stage} accessory={pet.accessory} size={compact ? 96 : 150} sleepy={moodOf(pet) === "sleepy"} />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-display text-2xl leading-none">{pet.name}</p><p className="text-xs font-bold text-muted">{STAGES[pet.stage]} · {pet.feedings} feedings</p>
          {([["Hunger", pet.hunger, "var(--domain-quests-fill)"], ["Happiness", pet.happiness, "var(--primary)"], ["Energy", pet.energy, "var(--domain-stats-fill)"]] as const).map(([l, v, c]) => <div key={l}><div className="flex justify-between text-[11px] font-bold"><span>{l}</span><span className="num">{Math.round(v)}</span></div><ProgressBar pct={v / 100} color={c} className="!h-2.5" /></div>)}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-sm" onClick={() => void feed(null)}><Cookie size={14} />Snack · 10</button>
        {foods.map((f) => <button key={f.id} className="btn btn-sm btn-lime" onClick={() => void feed(f.itemId)}>{getItem(f.itemId)?.name} x{f.qty}</button>)}
        <button className="btn btn-sm" onClick={play}><GameController size={14} />Play</button>
        <button className="btn btn-sm" onClick={nap}><Moon size={14} />Nap</button>
      </div>
      {!compact && pet.stage < 4 && (
        <div className="tile"><p className="mb-2 text-sm font-bold">Next: {STAGES[pet.stage + 1]}</p>
          <div className="grid grid-cols-2 gap-2">{prog.map((p) => <div key={p.label} className="text-xs"><div className="flex justify-between"><span>{p.label}</span><span className="num font-bold">{Math.min(p.have, p.need)}/{p.need}</span></div><ProgressBar pct={p.need ? p.have / p.need : 1} className="!h-2" /></div>)}</div>
          <button className="btn btn-lime btn-sm mt-3" disabled={!canEvolve(pet, g)} onClick={() => void evolve()}><Sparkle size={14} weight="fill" />Evolve</button></div>
      )}
      {!compact && <div className="flex flex-wrap items-center gap-2 text-xs"><span className="font-bold">Accessory:</span><button className={`chip !min-h-7 ${!pet.accessory ? "bg-ink text-paper" : ""}`} onClick={() => void petsRepo.update(pet.id, { accessory: undefined })}>None</button>{inv.filter((i) => getItem(i.itemId)?.cat === "accessory").map((i) => <button key={i.id} className={`chip !min-h-7 ${pet.accessory === i.itemId ? "bg-ink text-paper" : ""}`} onClick={() => void petsRepo.update(pet.id, { accessory: i.itemId })}>{getItem(i.itemId)?.name}</button>)}</div>}
    </div>
  );
}
export { SHOP };
