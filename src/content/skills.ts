export type Branch = "Focus" | "Combat" | "Beast";
export interface SkillDef {
  id: string; branch: Branch; name: string; desc: string; cost: number; requires: string[];
  x: number; y: number; mod: { xp?: number; coins?: number; focusXp?: number; dsaXp?: number; petDecay?: number };
}
export const SKILLS: SkillDef[] = [
  { id: "f1", branch: "Focus", name: "Steady Mind", desc: "+5% XP from focus sessions", cost: 1, requires: [], x: 15, y: 15, mod: { focusXp: 0.05 } },
  { id: "f2", branch: "Focus", name: "Deep Breath", desc: "+5% XP from everything", cost: 1, requires: ["f1"], x: 15, y: 45, mod: { xp: 0.05 } },
  { id: "f3", branch: "Focus", name: "Flow State", desc: "+10% XP from focus sessions", cost: 2, requires: ["f2"], x: 15, y: 75, mod: { focusXp: 0.1 } },
  { id: "c1", branch: "Combat", name: "Sharp Wits", desc: "+5% XP from DSA solves", cost: 1, requires: [], x: 50, y: 15, mod: { dsaXp: 0.05 } },
  { id: "c2", branch: "Combat", name: "Loot Eye", desc: "+10% coins", cost: 1, requires: ["c1"], x: 50, y: 45, mod: { coins: 0.1 } },
  { id: "c3", branch: "Combat", name: "Pattern Breaker", desc: "+15% XP from DSA solves", cost: 2, requires: ["c2"], x: 50, y: 75, mod: { dsaXp: 0.15 } },
  { id: "b1", branch: "Beast", name: "Gentle Hands", desc: "Pets lose hunger 15% slower", cost: 1, requires: [], x: 85, y: 15, mod: { petDecay: 0.15 } },
  { id: "b2", branch: "Beast", name: "Bond of Trust", desc: "+5% coins", cost: 1, requires: ["b1"], x: 85, y: 45, mod: { coins: 0.05 } },
  { id: "b3", branch: "Beast", name: "Wild Whisperer", desc: "Pets lose hunger 30% slower", cost: 2, requires: ["b2"], x: 85, y: 75, mod: { petDecay: 0.3 } },
];
