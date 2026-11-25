"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "motion/react";
import { useState } from "react";
import { Gift } from "@phosphor-icons/react";
import { Panels } from "@/components/shell/Panels";
import { BentoCard } from "@/components/shell/BentoCard";
import { EmptyState, HeroCard } from "@/components/ui/design-primitives";
import { Badge, PageFrame } from "@/components/ui/misc";
import { db } from "@/core/db";
import { gameRepo, inventoryRepo } from "@/core/repos";
import { useGame } from "@/core/settings";
import { GACHA_COST, RARITY, SHOP, getItem, type Rarity, type ShopCat, type ShopItem } from "@/content/play";
import { strobiSay } from "@/features/strobi/toast";
import { fireConfetti } from "@/lib/confetti";
import { playSfx } from "@/lib/audio";

async function give(item: ShopItem): Promise<boolean> {
  const row = await db.inventory.where("itemId").equals(item.id).first();
  if (row && item.cat !== "food") return false;
  if (row) await inventoryRepo.update(row.id, { qty: row.qty + 1 });
  else await inventoryRepo.add({ itemId: item.id, qty: 1, equipped: false });
  return true;
}
const CATS: ShopCat[] = ["food", "accessory", "border", "sound", "cursor"];
export function ShopPage() {
  const g = useGame();
  const inv = useLiveQuery(() => db.inventory.toArray(), [], []);
  const [cat, setCat] = useState<ShopCat>("food");
  const [roll, setRoll] = useState<{ item: ShopItem; dupe: boolean } | null>(null);
  const [opening, setOpening] = useState(false);
  const buy = async (it: ShopItem) => {
    if (g.coins < it.price) return strobiSay("Not enough coins yet.", "error");
    if (!(await give(it))) return strobiSay("You already own that.", "tip");
    await gameRepo.mutate((x) => ({ ...x, coins: x.coins - it.price }));
    strobiSay(`Bought ${it.name}`, "coin");
  };
  const open = async () => {
    if (g.coins < GACHA_COST || opening) return strobiSay(`A chest costs ${GACHA_COST} coins.`, "error");
    setOpening(true); setRoll(null);
    await gameRepo.mutate((x) => ({ ...x, coins: x.coins - GACHA_COST }));
    const total = Object.values(RARITY).reduce((a, r) => a + r.weight, 0);
    let n = Math.random() * total, rarity: Rarity = "common";
    for (const [k, r] of Object.entries(RARITY) as [Rarity, (typeof RARITY)[Rarity]][]) { if ((n -= r.weight) < 0) { rarity = k; break; } }
    const pool = SHOP.filter((s) => s.rarity === rarity);
    const item = pool[Math.floor(Math.random() * pool.length)] ?? SHOP[0];
    setTimeout(async () => {
      const got = await give(item);
      if (!got) await gameRepo.mutate((x) => ({ ...x, coins: x.coins + Math.round(item.price / 2) }));
      setRoll({ item, dupe: !got }); setOpening(false); playSfx(rarity === "legendary" ? "level" : "coin"); if (rarity !== "common") fireConfetti(rarity === "legendary");
    }, 1100);
  };
  const toggle = async (id: string, equipped: boolean, cat: ShopCat) => {
    if (!equipped) for (const r of inv) if (getItem(r.itemId)?.cat === cat && r.equipped) await inventoryRepo.update(r.id, { equipped: false });
    await inventoryRepo.update(id, { equipped: !equipped });
  };
  const store = (
    <HeroCard tint="play" hardShadow title="Catalog" subtitle={`${g.coins} coins`} className="h-full" bodyClassName="gap-3">
      <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto">{CATS.map((c) => <button key={c} className={`chip capitalize ${c === cat ? "bg-surface-inverse text-on-inverse" : ""}`} onClick={() => setCat(c)}>{c}</button>)}</div>
      <div className="scroll-thin grid min-h-0 flex-1 content-start gap-3 sm:grid-cols-2">
        {SHOP.filter((s) => s.cat === cat).map((s) => { const owned = inv.some((i) => i.itemId === s.id); return (
          <div key={s.id} className="tile flex flex-col gap-2 border-l-4 bg-surface" style={{ borderLeftColor: RARITY[s.rarity].color }}>
            <div className="flex items-start justify-between"><p className="font-bold">{s.name}</p><Badge color={RARITY[s.rarity].color} className="!text-on-inverse">{RARITY[s.rarity].label}</Badge></div>
            <p className="text-xs text-muted">{s.desc}</p>
            <button className="btn btn-sm btn-lime self-start" disabled={owned && s.cat !== "food"} onClick={() => void buy(s)}>{owned && s.cat !== "food" ? "Owned" : `Buy · ${s.price}`}</button>
          </div>
        ); })}
      </div>
    </HeroCard>
  );
  const side = (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <BentoCard title="Mystery chest" subtitle={`${GACHA_COST} coins per chest`} autoHeight className="shrink-0 surface-inverse" bodyClassName="items-center gap-3 text-center">
        <motion.div animate={opening ? { rotate: [0, -12, 12, -12, 12, 0], scale: [1, 1.1, 1] } : {}} transition={{ duration: 1 }} className="grid size-24 place-items-center rounded-[28px] border-[1.5px] border-border-strong bg-[var(--domain-play-fill)] text-on-primary"><Gift size={52} weight="duotone" /></motion.div>
        {roll && <div className="pop-in" role="status"><p className="font-display text-xl">{roll.item.name}</p><Badge color={RARITY[roll.item.rarity].color} className="!text-on-inverse">{RARITY[roll.item.rarity].label}</Badge>{roll.dupe && <p className="text-xs text-muted">Duplicate. Refunded {Math.round(roll.item.price / 2)} coins.</p>}</div>}
        <button className="btn btn-lime" disabled={opening} onClick={() => void open()}>{opening ? "Opening..." : "Open chest"}</button>
      </BentoCard>
      <BentoCard title="Inventory" className="flex-1 min-h-0">
        <div className="scroll-thin min-h-0 flex-1 space-y-2">
          {inv.length === 0 && <EmptyState title="Nothing yet" hint="Buy gear or open a chest above." mood="idle" />}
          {inv.map((i) => { const it = getItem(i.itemId); if (!it) return null; return <div key={i.id} className="tile flex items-center gap-2 !py-2"><span className="size-3 rounded-full" style={{ background: RARITY[it.rarity].color }} /><span className="flex-1 text-sm font-bold">{it.name}{it.cat === "food" && ` x${i.qty}`}</span>{it.cat !== "food" && <button className={`chip !min-h-7 text-xs ${i.equipped ? "bg-primary text-on-primary" : ""}`} aria-pressed={i.equipped} onClick={() => void toggle(i.id, i.equipped, it.cat)}>{i.equipped ? "Equipped" : "Equip"}</button>}</div>; })}
        </div>
      </BentoCard>
    </div>
  );
  return (
    <PageFrame title="Shop" subtitle="Spend coins on food, gear and gacha chests.">
      <Panels className="lg:grid-cols-12" panels={[{ id: "s", label: "Catalog", className: "lg:col-span-8", node: store }, { id: "i", label: "Chest", className: "lg:col-span-4", node: side }]} />
    </PageFrame>
  );
}
