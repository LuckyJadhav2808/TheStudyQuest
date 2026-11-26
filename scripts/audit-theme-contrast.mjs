import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

function extractVars(blockPattern) {
  const m = css.match(blockPattern);
  if (!m) throw new Error(`Block not found: ${blockPattern}`);
  const vars = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/--([a-z0-9-]+)\s*:\s*([^;]+);/i);
    if (kv) vars[kv[1]] = kv[2].trim();
  }
  return vars;
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return null;
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function luminance([r, g, b]) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrast(c1, c2) {
  const rgb1 = hexToRgb(c1);
  const rgb2 = hexToRgb(c2);
  if (!rgb1 || !rgb2) return null;
  const l1 = luminance(rgb1);
  const l2 = luminance(rgb2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const pastel = extractVars(/\[data-theme="peach"\]\s*\{([\s\S]*?)\}/);
const obsidian = extractVars(/\[data-theme="obsidian"\],\s*\[data-theme="ink"\]\s*\{([\s\S]*?)\}/);

const pairs = [
  ["ink", "bg"],
  ["ink", "surface"],
  ["ink", "surface-2"],
  ["ink-muted", "bg"],
  ["ink-muted", "surface"],
  ["on-primary", "primary"],
  ["primary-text", "bg"],
  ["primary-text", "surface"],
  ["on-inverse", "surface-inverse"],
  ["domain-focus-text", "domain-focus-tint"],
  ["domain-notes-text", "domain-notes-tint"],
  ["domain-quests-text", "domain-quests-tint"],
  ["domain-stats-text", "domain-stats-tint"],
  ["domain-play-text", "domain-play-tint"],
  ["domain-tools-text", "domain-tools-tint"],
];

let failed = 0;
for (const [name, vars] of [["pastel", pastel], ["obsidian", obsidian]]) {
  for (const [fg, bg] of pairs) {
    const ratio = contrast(vars[fg], vars[bg]);
    if (ratio !== null && ratio < 4.5) {
      console.error(`FAIL [${name}] ${fg} (${vars[fg]}) on ${bg} (${vars[bg]}): ${ratio.toFixed(2)}:1`);
      failed++;
    }
  }
}

if (failed > 0) process.exit(1);
console.log(`PASS: All ${pairs.length * 2} theme contrast pairs meet WCAG AA (>= 4.5:1).`);
