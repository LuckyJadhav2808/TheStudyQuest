"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { Flask } from "@phosphor-icons/react";
import { Panels } from "@/components/shell/Panels";
import { Card, CardTitle, Empty, IconBadge, PageFrame } from "@/components/ui/misc";
import { db } from "@/core/db";
import { buffsRepo, gameRepo } from "@/core/repos";
import { useGame } from "@/core/settings";
import { BUFF_NAMES, INGREDIENTS, RECIPES } from "@/content/play";
import { strobiSay } from "@/features/strobi/toast";
import { fireConfetti } from "@/lib/confetti";
import { fmtClock } from "@/lib/utils";

export function AlchemyPage() {
  const g = useGame();
  const buffs = useLiveQuery(() => db.buffs.toArray(), [], []);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const have = (id: string) => g.ingredients[id] ?? 0;
  async function brew(r: (typeof RECIPES)[number]) {
    if (!Object.entries(r.cost).every(([k, v]) => have(k) >= v)) return strobiSay("Missing ingredients for that brew.", "error");
    await gameRepo.mutate((x) => { const ing = { ...x.ingredients }; for (const [k, v] of Object.entries(r.cost)) ing[k] = (ing[k] ?? 0) - v; return { ...x, ingredients: ing }; });
    const ex = buffs.find((b) => b.kind === r.id && b.expiresAt > Date.now());
    const base = ex ? ex.expiresAt : Date.now();
    if (ex) await buffsRepo.update(ex.id, { expiresAt: base + r.hours * 3600000 }); else await buffsRepo.add({ kind: r.id, expiresAt: base + r.hours * 3600000 });
    strobiSay(`${r.name} brewed. ${r.desc}.`, "levelup"); fireConfetti();
  }
  const transmute = async () => {
    if (have("stardust") < 3) return strobiSay("Transmuting needs 3 Stardust.", "error");
    await gameRepo.mutate((x) => ({ ...x, ingredients: { ...x.ingredients, stardust: x.ingredients.stardust - 3, elixir: (x.ingredients.elixir ?? 0) + 1 } }));
    strobiSay("3 Stardust became a Focus Elixir.", "tip");
  };
  const live = buffs.filter((b) => b.expiresAt > now);
  const pantry = (
    <Card className="gap-3">
      <CardTitle sub="Earned from focus, quests, DSA and chests">Ingredients</CardTitle>
      <div className="scroll-thin min-h-0 flex-1 space-y-2">
        {INGREDIENTS.map((i) => <div key={i.id} className="tile flex items-center gap-3"><IconBadge color={i.color}><Flask size={22} weight="duotone" /></IconBadge><div className="flex-1"><p className="font-bold">{i.name}</p><p className="text-xs text-muted">{i.hint}</p></div><span className="font-display num text-3xl">{have(i.id)}</span></div>)}
        <button className="btn btn-sm" onClick={() => void transmute()}>Transmute 3 Stardust to 1 Elixir</button>
      </div>
    </Card>
  );
  const brewing = (
    <Card className="gap-3">
      <CardTitle sub="Buffs stack their duration">Cauldron</CardTitle>
      <div className="scroll-thin min-h-0 flex-1 space-y-2">
        {RECIPES.map((r) => { const ok = Object.entries(r.cost).every(([k, v]) => have(k) >= v); return (
          <div key={r.id} className="tile flex flex-wrap items-center gap-3"><div className="min-w-0 flex-1"><p className="font-bold">{r.name}</p><p className="text-xs text-muted">{r.desc}</p><p className="mt-1 text-xs">{Object.entries(r.cost).map(([k, v]) => `${v} ${INGREDIENTS.find((i) => i.id === k)?.name}`).join(" + ")}</p></div><button className="btn btn-lime btn-sm" disabled={!ok} onClick={() => void brew(r)}>Brew</button></div>
        ); })}
      </div>
    </Card>
  );
  const active = (
    <Card className="gap-3">
      <CardTitle sub="Applied automatically to rewards">Active buffs</CardTitle>
      <div className="scroll-thin min-h-0 flex-1 space-y-2">
        {live.length === 0 ? <Empty title="No active buffs" hint="Brew something to multiply your XP or coins." /> : live.map((b) => <div key={b.id} className="tile flex items-center justify-between border-[1.5px] border-line bg-lime text-ink"><span className="font-bold">{BUFF_NAMES[b.kind] ?? b.kind}</span><span className="num font-display text-2xl">{fmtClock(b.expiresAt - now).padStart(5, "0")}</span></div>)}
      </div>
    </Card>
  );
  return (
    <PageFrame title="Alchemy" subtitle="Brew buffs from the things you earn.">
      <Panels className="lg:grid-cols-12" panels={[{ id: "p", label: "Pantry", className: "lg:col-span-4", node: pantry }, { id: "b", label: "Brew", className: "lg:col-span-4", node: brewing }, { id: "a", label: "Active", className: "lg:col-span-4", node: active }]} />
    </PageFrame>
  );
}
