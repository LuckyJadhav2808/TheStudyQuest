export type Rarity = "common" | "rare" | "epic" | "legendary";
export const RARITY: Record<Rarity, { label: string; color: string; weight: number }> = {
  common: { label: "Common", color: "#8A94A6", weight: 60 }, rare: { label: "Rare", color: "#2E8BFF", weight: 25 },
  epic: { label: "Epic", color: "#7C5CFF", weight: 11 }, legendary: { label: "Legendary", color: "#E6B422", weight: 4 },
};
export type ShopCat = "food" | "accessory" | "border" | "sound" | "cursor";
export interface ShopItem { id: string; name: string; cat: ShopCat; rarity: Rarity; price: number; desc: string; hunger?: number; happy?: number }
export const SHOP: ShopItem[] = [
  { id: "kibble", name: "Study Kibble", cat: "food", rarity: "common", price: 10, desc: "Fills 25 hunger.", hunger: 25, happy: 2 },
  { id: "salmon", name: "Focus Salmon", cat: "food", rarity: "rare", price: 30, desc: "Fills 50 hunger, a happy treat.", hunger: 50, happy: 10 },
  { id: "starfruit", name: "Starfruit", cat: "food", rarity: "epic", price: 80, desc: "Fills 100 hunger and lifts the mood.", hunger: 100, happy: 30 },
  { id: "partyhat", name: "Party Hat", cat: "accessory", rarity: "common", price: 40, desc: "Every day is a celebration." },
  { id: "glasses", name: "Scholar Glasses", cat: "accessory", rarity: "rare", price: 90, desc: "+10 percent wisdom, visually." },
  { id: "scarf", name: "Cozy Scarf", cat: "accessory", rarity: "rare", price: 100, desc: "For late-night sessions." },
  { id: "wizard", name: "Wizard Hat", cat: "accessory", rarity: "epic", price: 220, desc: "Arcane study energy." },
  { id: "crown", name: "Golden Crown", cat: "accessory", rarity: "legendary", price: 600, desc: "For the top of the leaderboard." },
  { id: "ring-lime", name: "Lime Ring", cat: "border", rarity: "common", price: 50, desc: "A clean lime avatar border." },
  { id: "ring-flame", name: "Flame Border", cat: "border", rarity: "epic", price: 250, desc: "Burning with streaks." },
  { id: "ring-gold", name: "Gilded Border", cat: "border", rarity: "legendary", price: 700, desc: "Pure gold." },
  { id: "snd-8bit", name: "8-bit Sound Pack", cat: "sound", rarity: "rare", price: 120, desc: "Chiptune UI sounds." },
  { id: "snd-chime", name: "Crystal Chimes", cat: "sound", rarity: "epic", price: 200, desc: "Glassy, calm chimes." },
  { id: "cur-star", name: "Star Cursor", cat: "cursor", rarity: "rare", price: 110, desc: "A little star follows you." },
  { id: "cur-paw", name: "Paw Cursor", cat: "cursor", rarity: "common", price: 60, desc: "Soft paws." },
];
export const getItem = (id: string): ShopItem | undefined => SHOP.find((s) => s.id === id);
export const GACHA_COST = 60;

export const INGREDIENTS = [
  { id: "stardust", name: "Stardust", color: "#FFE2D2", hint: "Dropped by focus blocks" },
  { id: "phoenix", name: "Phoenix Feather", color: "#FF8B4A", hint: "Rare drop. Levelling up helps" },
  { id: "elixir", name: "Focus Elixir", color: "#1FD6C1", hint: "Task completions, or transmute 3 Stardust" },
  { id: "crystal", name: "Mind Crystal", color: "#E8E4FF", hint: "Hard DSA problems" },
  { id: "goldleaf", name: "Gold Leaf", color: "#E6B422", hint: "Daily chest" },
] as const;
export const RECIPES = [
  { id: "hyperfocus", name: "Hyper-Focus", desc: "+50% XP for 2 hours", hours: 2, cost: { stardust: 1, elixir: 1 } },
  { id: "shield", name: "Streak Shield", desc: "Forgives one missed day for 24 hours", hours: 24, cost: { phoenix: 1, stardust: 1 } },
  { id: "midas", name: "Midas Brew", desc: "2x coins for 2 hours", hours: 2, cost: { goldleaf: 1, crystal: 1 } },
] as const;
export const BUFF_NAMES: Record<string, string> = { hyperfocus: "Hyper-Focus", shield: "Streak Shield", midas: "Midas Brew" };
